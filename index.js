"use strict";

let acorn = require("acorn"),
    chalk = require("chalk"),
    reporters = require("./lib/reporters"),
    trimRight = require("lodash.trimright"),
    util = require("util");

const kDefaultColorMap = new Map([
    ["file", chalk.gray.bold],
    ["location", chalk.gray.bold],
    ["error", chalk.red.bold],
    ["warning", chalk.magenta.bold],
    ["note", chalk.yellow.bold],
    ["message", chalk.gray.bold],
    ["source", null],
    ["caret", chalk.green]
]);

let colorMap = new Map(kDefaultColorMap);

exports.setColorMap = function(map)
{
    let keys = map.constructor === Map ? map.keys() : Object.keys(map);

    for (let key of keys)
    {
        if (colorMap.has(key))
            colorMap.set(key, map.get(key));
    }
};

exports.resetColorMap = function()
{
    colorMap = new Map(kDefaultColorMap);
};

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

        if (global.Error.captureStackTrace)
            global.Error.captureStackTrace(this);

        this.name = "Issue";
        this.message = message || "";

        function findLineEnd(text, pos)
        {
            acorn.lineBreakG.lastIndex = pos;

            let match = acorn.lineBreakG.exec(text);

            if (match)
                return match.index;

            return text.length;
        }

        // Allow empty constructor so we can use tests like chai.should.throw,
        // which call an empty constructor to test against.
        if (source !== undefined)
        {
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

    getFormattedMessage(colorize)
    {
        let enabled = chalk.enabled;

        colorize = colorize === undefined ? true : !!colorize;
        chalk.enabled = colorize;

        function colorizeText(color, text)
        {
            if (!colorize)
                return text;

            let func = colorMap.get(color);

            if (func)
                return func(text);

            return text;
        }

        let coloredFile = colorizeText("file", this.file + ":"),
            location = `${this.lineInfo.line}:${this.lineInfo.column + 1}:`,
            coloredLocation = colorizeText("location", location),
            severity = colorizeText(this.severity, this.severity + ":"),
            caret = " ".repeat(this.source.length);

        caret = caret.substring(0, this.lineInfo.column) +
            colorizeText("caret", "^") +
            trimRight(caret.substring(this.lineInfo.column + 1));

        let message = this.message.charAt(0).toLowerCase() + this.message.substr(1),
            data = {
                context: coloredFile + coloredLocation,
                severity: severity,
                message: colorizeText("message", message),
                source: colorizeText("source", this.source),
                caret: caret
            },
            formattedMessage = `${data.context} ${data.severity} ${data.message}\n${data.source}\n${data.caret}\n`;

        chalk.enabled = enabled;

        return formattedMessage;
    }

    /**
     * Return a stack trace for this issue, filtering out internal calls.
     *
     * @param {string[]} filter - Array of calls in the stack trace to filter out. Don't include "at ",
     * and be sure to regex escape the text, for example: ["Parser\\.acorn.Parser.objj_raise"]
     * @returns {string}
     */
    getStackTrace(filter)
    {
        // finder function sets this to the line index of the first found line
        let lineIndex = 0;

        function finder(match)
        {
            let regex = new RegExp("^\\s+at " + match);

            return function(element, index)
            {
                if (regex.test(element))
                {
                    lineIndex = index;

                    return true;
                }
            };
        }

        let stack = this.stack.split("\n"),
            first = -1; // index of the first item we want to keep

        /*
            Get rid of our internal stuff. Look for the following stack items:

            - Whatever is specified in filter
            - Object.exports.addAcornError
            - 2 after addIssueFromArgs
            - exports.addIssue
            - new exports.*
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
            if (stack.some(finder("Object\\.exports\\.addAcornError")))
                first = lineIndex + 1;
            else if (stack.some(finder("addIssueFromArgs")))
                first = lineIndex + 2;
            else if (stack.some(finder("exports\\.addIssue")) || stack.some(finder("new exports\\.")))
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

// Functional API

function addIssue(Class, issues, source, file, location, message)
{
    // Mozilla docs say not to use Array.prototype.slice on arguments
    function slice(args, start)
    {
        let copy = [];

        for (let i = start; i < args.length; ++i)
            copy.push(args[i]);

        return copy;
    }

    let args = slice(arguments, 6);

    args.unshift(message);

    let issue = new Class(
            source,
            file,
            location,
            util.format.apply(null, args)
        );

    issues.push(issue);

    return issue;
}

function addIssueFromArgs(Class, args)
{
    let newArgs = Array.from(args);

    newArgs.unshift(Class);

    return addIssue.apply(null, newArgs);
}

/* eslint-disable no-unused-vars */

exports.addNote = function(issues, source, file, location, message)
{
    return addIssueFromArgs(exports.Note, arguments);
};

exports.addWarning = function(issues, source, file, location, message)
{
    return addIssueFromArgs(exports.Warning, arguments);
};

exports.addError = function(issues, source, file, location, message)
{
    return addIssueFromArgs(exports.Error, arguments);
};

/* eslint-enable */

let stripLocRE = /^(.+)\s+\(\d+:\d+\)$/;

exports.stripLocation = function(text)
{
    // Strip (line:column) from message
    let match = stripLocRE.exec(text);

    return match ? match[1] : text;
};

exports.addAcornError = function(issues, error, source, file)
{
    // Make a fake location object that contains the start position of the error
    let location = {
            start: error.pos,
            end: error.pos,
            loc: { line: error.loc.line, column: error.loc.column }
        },
        message = exports.stripLocation(error.message),
        ex = exports.addError(
            issues,
            source,
            file,
            location,
            message
        );

    // Set the name to "SyntaxError" so we see that in a stack trace
    ex.name = "SyntaxError";

    return ex;
};

exports.getErrorCount = function(issues)
{
    return issues.filter(issue => issue.isError()).length;
};

exports.getWarningCount = function(issues)
{
    return issues.filter(issue => issue.isWarning()).length;
};

function runReport(ReporterClass, issues, colorize)
{
    colorize = colorize === undefined ? true : !!colorize;

    return new ReporterClass(colorize).report(issues);
}

exports.getFormattedIssues = function(issues, colorize)
{
    return runReport(reporters.StandardReporter, issues, colorize);
};

exports.logIssues = function(issues, colorize)
{
    runReport(reporters.ConsoleReporter, issues, colorize);
};

exports.Note = Note;
exports.Warning = Warning;
exports.Error = Error;
exports.StandardReporter = reporters.StandardReporter;
exports.SilentReporter = reporters.SilentReporter;
