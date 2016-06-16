"use strict";

const
    acorn = require("acorn"),
    functions = require("./functions.js"),
    trimRight = require("lodash.trimright");

/**
 * Base class for all acorn-based issues.
 *
 * @class
 *
 * @param {string} source - The source code in which the issue occurred, or an object with a "line"
 * property containing the source line in which the issue occurred. In the latter case, `location`
 * should contain a `loc` subobject with the line and column number.
 * @param {string} file - The path to the source code. This is not checked in any way so may be virtual,
 * for example "<command line>".
 * @param {acorn.Node|acorn.SourceLocation|SyntaxError|object|number} location - Where the issue occurred
 * within the source. If an object, it must contain start and end properties that are zero-based indexes
 * into the source code.
 * @param {string} message - The message to display to the user.
 * @param {string} severity - Should be "error", "warning" or "note".
 */
class Issue extends SyntaxError
{
    constructor(source, file, location, message, severity)
    {
        super();

        // istanbul ignore else: should never be false, defensive check
        if (global.Error.captureStackTrace)
            global.Error.captureStackTrace(this);

        this.name = "Issue";
        this.message = message || /* istanbul ignore next */ "";

        if (location.loc)
        {
            const loc = location.loc;

            if (loc.start)
            {
                this.lineInfo = {
                    line: loc.start.line,
                    column: loc.start.column
                };
            }
            else
            {
                this.lineInfo = {
                    line: loc.line,
                    column: loc.column
                };
            }
        }
        else
        {
            if (typeof location === "number")
                location = { start: location, end: location };

            this.lineInfo = acorn.getLineInfo(source, location.start);
        }

        this.lineInfo.lineStart = location.start - this.lineInfo.column;

        if (typeof source === "string")
        {
            this.lineInfo.lineEnd = functions.findLineEnd(source, location.start);
            this.source = trimRight(source.substring(this.lineInfo.lineStart, this.lineInfo.lineEnd));
        }
        else if (source.hasOwnProperty("line") && typeof source.line === "string")
        {
            this.source = source.line;
            this.lineInfo.lineEnd = this.lineInfo.lineStart + this.source.length;
        }
        else
            throw new TypeError("source must be a string or { line: <string> }");

        this.file = file;
        this.severity = severity;
    }

    isError()
    {
        return this instanceof exports.Error;
    }

    isWarning()
    {
        return this instanceof exports.Warning;
    }

    isNote()
    {
        return this instanceof exports.Note;
    }

    /**
     * Return a stack trace for this issue, filtering out internal calls.
     *
     * @param {string[]} [filter] - Array of calls in the stack trace to filter out.
     * Everything at or above a matching call is removed from the stack trace. Don't include "at ",
     * and be sure to regex escape the text, for example: ["Parser\\.acorn.Parser.objj_raise"]
     * @returns {string} - Formatted stack trace.
     */
    getStackTrace(filter)
    {
        // finder function sets this to the line index of the first found line
        let lineIndex = 0;

        function finder(match)
        {
            let regex = new RegExp(`^\\s+at (${match}) \\(`);

            return function(element, index)
            {
                if (regex.test(element))
                {
                    lineIndex = index;

                    return true;
                }

                return false;
            };
        }

        const stack = this.stack.split("\n");

        // index of the first item we want to keep
        let first = -1;

        /*
            Get rid of our internal stuff. Look for the following stack items:

            - Whatever is specified in filter
            - IssueList.addAcornError
            - 2 after IssueList.addFromArgs
            - (Error|Warning|Note|Issue)
            - IssueList.add(Error|Warning|Note|Issue)
        */
        if (filter !== undefined)
        {
            for (let f of filter)
            {
                if (stack.some(finder(f)))
                {
                    first = lineIndex + 1;
                    break;
                }
            }
        }

        if (first < 0)
        {
            if (stack.some(finder("IssueList\\.addAcornError")))
                first = lineIndex + 1;

            else if (stack.some(finder("IssueList\\.addFromArgs")))
                first = lineIndex + 2;

            // istanbul ignore else: defensive, shouldn't happen
            else if (stack.some(finder("(Error|Warning|Note|Issue)")))
                first = lineIndex + 1;

            else if (stack.some(finder("IssueList.add(Error|Warning|Note|Issue)")))
                first = lineIndex + 1;

            else
                first = 1;
        }

        stack.splice(1, first - 1);

        return stack.join("\n");
    }
}

/** @class */
class Note extends Issue
{
    constructor(source, file, location, message)
    {
        super(source, file, location, message, "note");
        this.name = "Note";
    }
}

/** @class */
class Warning extends Issue
{
    constructor(source, file, location, message)
    {
        super(source, file, location, message, "warning");
        this.name = "Warning";
    }
}

/** @class */
class Error extends Issue
{
    constructor(source, file, location, message)
    {
        super(source, file, location, message, "error");
        this.name = "Error";
    }
}

exports.isIssue = error => error instanceof Issue;

exports.Issue = Issue;
exports.Note = Note;
exports.Warning = Warning;
exports.Error = Error;
