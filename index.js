"use strict";

var acorn = require("acorn"),
    chalk = require("chalk"),
    lodashTemplate = require("lodash.template"),
    repeat = require("lodash.repeat"),
    reporters = require("./lib/reporters"),
    trimRight = require("lodash.trimright"),
    util = require("util");

// jscs: disable requireMultipleVarDecl

var colorMap = {
        file: chalk.gray.bold,
        location: chalk.gray.bold,
        error: chalk.red.bold,
        warning: chalk.magenta.bold,
        note: chalk.yellow.bold,
        message: chalk.gray.bold,
        source: null,
        caret: chalk.green
    },
    messageTemplate = null;

// jscs: enable

exports.setColorMap = function(map)
{
    var keys = Object.keys(map);

    for (var i = 0; i < keys.length; ++i)
    {
        var key = keys[i];

        if (colorMap.hasOwnProperty(key))
            colorMap[key] = map[key];
    }
};

function noColor(text)
{
    return text;
}

function findLineEnd(source, pos)
{
    acorn.lineBreakG.lastIndex = pos;

    var match = acorn.lineBreakG.exec(source);

    if (match)
        return match.index;

    return source.length;
}

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
var Issue = function(source, file, location, message, severity)
{
    SyntaxError.call(this);

    if (global.Error.captureStackTrace)
        global.Error.captureStackTrace(this);

    this.name = "Issue";
    this.message = message || "";

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
        this.highlightedNodes = [];
        this.severity = severity;
    }
};

exports.Issue = Issue;
util.inherits(Issue, SyntaxError);

Issue.prototype.addHighlight = function(location)
{
    this.highlightedNodes.push(location);
};

Issue.prototype.isError = function()
{
    return this instanceof exports.Error;
};

Issue.prototype.isWarning = function()
{
    return this instanceof exports.Warning;
};

Issue.prototype.isNote = function()
{
    return this instanceof exports.Note;
};

Issue.prototype.getFormattedMessage = function(colorize)
{
    var enabled = chalk.enabled;

    colorize = colorize === undefined ? true : !!colorize;
    chalk.enabled = colorize;

    if (!messageTemplate)
    {
        messageTemplate = lodashTemplate(
            "${data.context} ${data.severity} ${data.message}\n" +
            "${data.source}\n" +
            "${data.caret}\n",
            { variable: "data" }
        );
    }

    var coloredFile = (colorMap.file || noColor)(this.file + ":"),
        location = util.format("%d:%d:", this.lineInfo.line, this.lineInfo.column + 1),
        coloredLocation = (colorMap.location || noColor)(location),
        severity = (colorMap[this.severity] || noColor)(this.severity + ":"),
        caret = repeat(" ", this.source.length);

    caret = caret.substring(0, this.lineInfo.column) +
                (colorMap.caret || noColor)("^") +
                trimRight(caret.substring(this.lineInfo.column + 1));

    var message = this.message.charAt(0).toLowerCase() + this.message.substr(1),
        formattedMessage = messageTemplate(
            {
                context: coloredFile + coloredLocation,
                severity: severity,
                message: (colorMap.message || noColor)(message),
                source: (colorMap.source || noColor)(this.source),
                caret: caret
            }
        );

    chalk.enabled = enabled;

    return formattedMessage;
};

/**
 * Return a stack trace for this issue, filtering out internal calls.
 *
 * @param {string[]} filter - Array of calls in the stack trace to filter out. Don't include "at ",
 * and be sure to regex escape the text, for example: ["Parser\\.acorn.Parser.objj_raise"]
 * @returns {string}
 */
Issue.prototype.getStackTrace = function(filter)
{
    // finder function sets this to the line index of the first found line
    var lineIndex = 0;

    function finder(match)
    {
        var regex = new RegExp("^\\s+at " + match);

        return function(element, index)
        {
            if (regex.test(element))
            {
                lineIndex = index;

                return true;
            }
        };
    }

    var stack = this.stack.split("\n"),
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
        for (var i = 0; i < filter.length; ++i)
        {
            if (stack.some(finder(filter[i])))
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
};

/** @class */
exports.Note = function(source, file, location, message)
{
    exports.Note.super_.call(this, source, file, location, message, "note");
    this.name = "Note";
};

util.inherits(exports.Note, Issue);

/** @class */
exports.Warning = function(source, file, location, message)
{
    exports.Warning.super_.call(this, source, file, location, message, "warning");
    this.name = "Warning";
};

util.inherits(exports.Warning, Issue);

/** @class */
exports.Error = function(source, file, location, message)
{
    exports.Error.super_.call(this, source, file, location, message, "error");
    this.name = "Error";
};

util.inherits(exports.Error, Issue);

function slice(args, start)
{
    var copy = [];

    if (start === undefined)
        start = 0;

    for (var i = start; i < args.length; ++i)
        copy.push(args[i]);

    return copy;
}

function addIssue(Class, issues, source, file, location, message)
{
    // Mozilla docs say not to use Array.prototype.slice on arguments
    var args = slice(arguments, 6);

    args.unshift(message);

    var issue = new Class(
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
    var newArgs = slice(args);

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

var stripLocRE = /^(.+)\s+\(\d+:\d+\)$/;

exports.stripLocation = function(text)
{
    // Strip (line:column) from message
    var match = stripLocRE.exec(text);

    return match ? match[1] : text;
};

exports.addAcornError = function(issues, error, source, file)
{
    // Make a fake location object that contains the start position of the error
    var location = {
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
    var errors = issues.filter(function(issue) { return issue.isError(); });

    return errors.length;
};

exports.getWarningCount = function(issues)
{
    var errors = issues.filter(function(issue) { return issue.isWarning(); });

    return errors.length;
};

function runReport(issues, ReporterClass, colorize)
{
    colorize = arguments.length > 1 ? !!colorize : true;

    var reporter = new ReporterClass(colorize);

    return reporter.report(issues);
}

exports.getFormattedIssues = function(issues, colorize)
{
    return runReport(issues, reporters.StandardReporter, colorize);
};

exports.logIssues = function(issues, colorize)
{
    runReport(issues, reporters.ConsoleReporter, colorize);
};

exports.StandardReporter = reporters.StandardReporter;
exports.SilentReporter = reporters.SilentReporter;
