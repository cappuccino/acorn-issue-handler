"use strict";

const
    acorn = require("acorn"),
    colors = require("./colors.js"),
    reporters = require("./reporters"),
    trimRight = require("lodash.trimright"),
    util = require("util");

/**
 * Base class for all acorn-based issues.
 *
 * @class
 *
 * @param {string} source - The source code in which the issue occurred.
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

        function findLineEnd(text, pos)
        {
            acorn.lineBreakG.lastIndex = pos;

            const match = acorn.lineBreakG.exec(text);

            if (match)
                return match.index;

            return text.length;
        }

        if (location.loc)
        {
            this.lineInfo = {
                line: location.loc.line,
                column: location.loc.column
            };
        }
        else
        {
            if (typeof location === "number")
                location = { start: location, end: location };

            this.lineInfo = acorn.getLineInfo(source, location.start);
        }

        this.lineInfo.lineStart = location.start - this.lineInfo.column;
        this.lineInfo.lineEnd = findLineEnd(source, location.end);
        this.lineInfo.sourceLength = source.length;
        this.source = trimRight(source.substring(this.lineInfo.lineStart, this.lineInfo.lineEnd));
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
     * @returns {string}
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

// IssueList

/** @class */
class IssueList
{
    constructor()
    {
        this._issues = [];
    }

    get issues()
    {
        return this._issues;
    }

    *[Symbol.iterator]()
    {
        yield *this._issues;
    }

    get length()
    {
        return this._issues.length;
    }

    addIssue(Class, source, file, location, message)
    {
        // Mozilla docs say not to use Array.prototype.slice on arguments
        function slice(args, start)
        {
            const copy = [];

            for (let i = start; i < args.length; ++i)
                copy.push(args[i]);

            return copy;
        }

        const args = slice(arguments, 5);

        args.unshift(message);

        const issue = new Class(
            source,
            file,
            location,
            util.format.apply(null, args)
        );

        this._issues.push(issue);

        return issue;
    }

    addFromArgs(Class, args)
    {
        const newArgs = Array.from(args);

        newArgs.unshift(Class);

        return this.addIssue.apply(this, newArgs);
    }

    /* eslint-disable no-unused-vars */

    addNote(source, file, location, message)
    {
        return this.addFromArgs(exports.Note, arguments);
    }

    addWarning(source, file, location, message)
    {
        return this.addFromArgs(exports.Warning, arguments);
    }

    addError(source, file, location, message)
    {
        return this.addFromArgs(exports.Error, arguments);
    }

    /* eslint-enable */

    addAcornError(error, source, file)
    {
        // Make a fake location object that contains the start position of the error
        const
            location = {
                start: error.pos,
                end: error.pos,
                loc: { line: error.loc.line, column: error.loc.column }
            },
            message = exports.stripLocation(error.message),
            ex = this.addError(
                source,
                file,
                location,
                message
            );

        // Set the name to "SyntaxError" so we see that in a stack trace
        ex.name = "SyntaxError";

        return ex;
    }

    get errorCount()
    {
        return this._issues.filter(issue => issue.isError()).length;
    }

    get warningCount()
    {
        return this._issues.filter(issue => issue.isWarning()).length;
    }

    render(options)
    {
        return new reporters.StandardReporter(options).report(this);
    }

    log(options)
    {
        return new reporters.ConsoleReporter(options).report(this);
    }
}

// Functional API

const stripLocRE = /^(.+)\s+\(\d+:\d+\)$/;

exports.stripLocation = function(text)
{
    // Strip (line:column) from message
    let match = stripLocRE.exec(text);

    return match ? match[1] : text;
};

exports.isIssue = error => error instanceof Issue;

exports.setColorMap = map => colors.setColorMap(map);
exports.resetColorMap = () => colors.resetColorMap();

exports.Note = Note;
exports.Warning = Warning;
exports.Error = Error;
exports.IssueList = IssueList;
exports.StandardReporter = reporters.StandardReporter;
exports.SilentReporter = reporters.SilentReporter;
