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
        note: "yellow",
        warning: "magenta",
        error: "red",
        message: "gray",
        caret: "green",
        highlight: "red"
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

function findLineEnd(source, pos)
{
    acorn.lineBreakG.lastIndex = pos;

    var match = acorn.lineBreakG.exec(source);

    if (match)
        return match.index;

    return source.length;
}

var Issue = exports.Issue = function(source, sourcePath, location, message, severity)
{
    global.Error.call(this);

    if (global.Error.captureStackTrace)
        global.Error.captureStackTrace(this);

    this.name = "Issue";
    this.message = message || "";

    // Allow empty constructor so we can use tests like chai.should.throw,
    // which call an empty constructor to test against.
    if (source !== undefined)
    {
        /*
            location could be:

            - acorn.Node
            - SyntaxError raised by acorn
            - acorn.SourceLocation
            - object with start property
            - numeric start position
        */
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
        this.sourcePath = sourcePath;
        this.highlightedNodes = [];
        this.severity = severity;
    }
};

util.inherits(Issue, global.Error);

Issue.prototype.isWarning = function()
{
    return this.severity === "warning";
};

Issue.prototype.isError = function()
{
    return this.severity === "error";
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
            "${data.highlights}\n",
            { variable: "data" }
        );
    }

    var context = util.format("%s:%d:%d:", this.sourcePath, this.lineInfo.line, this.lineInfo.column + 1),
        coloredContext = chalk[colorMap.message](context),
        severity = chalk[colorMap[this.severity]](this.severity + ":"),
        highlights = repeat(" ", this.source.length);

    for (var i = 0; i < this.highlightedNodes.length; i++)
    {
        var location = this.highlightedNodes[i];

        // Make sure the highlight is in range of the source line
        if (location.start >= this.lineInfo.lineStart &&
            location.start < (this.lineInfo.lineStart + this.lineInfo.sourceLength))
        {
            var offset = location.start - this.lineInfo.lineStart,
                length = location.end - location.start;

            highlights = highlights.substring(0, offset) +
                         chalk[colorMap.highlight](repeat("‾", length)) +
                         highlights.substring(offset + length);
        }
    }

    highlights = highlights.substring(0, this.lineInfo.column) +
                 chalk[colorMap.caret]("^") +
                 trimRight(highlights.substring(this.lineInfo.column + 1));

    var message = this.message.charAt(0).toLowerCase() + this.message.substr(1),
        formattedMessage = messageTemplate(
            {
                context: coloredContext,
                severity: severity,
                message: chalk[colorMap.message](message),
                source: this.source,
                highlights: highlights
            }
        );

    chalk.enabled = enabled;

    return formattedMessage;
};

Issue.prototype.getStackTrace = function()
{
    function finder(match)
    {
        var regex = new RegExp("^\\s+at " + match);

        return function(element, index)
        {
            if (regex.test(element))
            {
                i = index;

                return true;
            }
        };
    }

    var stack = this.stack.split("\n"),
        i = 0,
        first = 1; // index of the first item we want to keep

    /*
        Get rid of our internal stuff. Look for the following stack items:

        - Object.exports.addAcornError
        - 2 after addIssueFromArgs
        - exports.addIssue
        - new exports.*
    */
    if (stack.some(finder("Object\\.exports\\.addAcornError")))
        first = i + 1;
    else if (stack.some(finder("addIssueFromArgs")))
        first = i + 2;
    else if (stack.some(finder("exports\\.addIssue")) || stack.some(finder("new exports\\.")))
        first = i + 1;

    stack.splice(1, first - 1);

    return stack.join("\n");
};

Issue.prototype.addHighlight = function(location)
{
    this.highlightedNodes.push(location);
};

exports.Note = function(source, sourcePath, location, message)
{
    exports.Note.super_.call(this, source, sourcePath, location, message, "note");
    this.name = "Note";
};

util.inherits(exports.Note, Issue);

exports.Warning = function(source, sourcePath, location, message)
{
    exports.Warning.super_.call(this, source, sourcePath, location, message, "warning");
    this.name = "Warning";
};

util.inherits(exports.Warning, Issue);

exports.Error = function(source, sourcePath, location, message)
{
    exports.Error.super_.call(this, source, sourcePath, location, message, "error");
    this.name = "Error";
};

util.inherits(exports.Error, Issue);

exports.FatalError = function(source, sourcePath, location, message)
{
    exports.FatalError.super_.call(this, source, sourcePath, location, message || "a fatal error occurred", "error");
    this.name = "FatalError";
};

util.inherits(exports.FatalError, exports.Error);

exports.InternalError = function(source, sourcePath, location, message)
{
    exports.InternalError.super_.call(
        this, source, sourcePath, location, message || "an internal error occurred", "error");

    this.name = "InternalError";
};

util.inherits(exports.InternalError, exports.FatalError);

function slice(args, start)
{
    var copy = [];

    if (start === undefined)
        start = 0;

    for (var i = start; i < args.length; ++i)
        copy.push(args[i]);

    return copy;
}

exports.addIssue = function(Class, issues, source, sourcePath, location, message)
{
    // Mozilla docs say not to use Array.prototype.slice on arguments
    var args = slice(arguments, 6);

    args.unshift(message);

    var issue = new Class(
            source,
            sourcePath,
            location,
            util.format.apply(null, args)
        );

    issues.push(issue);

    return issue;
};

function addIssueFromArgs(Class, args)
{
    var newArgs = slice(args);

    newArgs.unshift(Class);

    return exports.addIssue.apply(null, newArgs);
}

/* eslint-disable no-unused-vars */

exports.addNote = function(issues, source, sourcePath, location, message)
{
    return addIssueFromArgs(exports.Note, arguments);
};

exports.addWarning = function(issues, source, sourcePath, location, message)
{
    return addIssueFromArgs(exports.Warning, arguments);
};

exports.addError = function(issues, source, sourcePath, location, message)
{
    return addIssueFromArgs(exports.Error, arguments);
};

exports.addFatalError = function(issues, source, sourcePath, location, message)
{
    return addIssueFromArgs(exports.FatalError, arguments);
};

exports.addInternalError = function(issues, source, sourcePath, location, message)
{
    return addIssueFromArgs(exports.InternalError, arguments);
};

/* eslint-enable */

var stripLocRE = /^(.+)\s*\(\d+:\d+\)$/;

exports.addAcornError = function(issues, error, source, sourcePath)
{
    // Make a fake location object that contains the start position of the error
    var location = {
            start: error.pos,
            end: error.pos,
            loc: { line: error.loc.line, column: error.loc.column }
        },
        message = error.message,

        // Strip (line:column) from message
        match = stripLocRE.exec(message);

    if (match)
        message = match[1];

    return exports.addError(
        issues,
        source,
        sourcePath,
        location,
        message
    );
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

exports.getFormattedIssues = function(issues, colorize)
{
    colorize = arguments.length > 1 ? !!colorize : true;

    var reporter = new reporters.StandardReporter(colorize);

    return reporter.report(issues);
};

exports.logIssues = function(issues, colorize)
{
    colorize = arguments.length > 1 ? !!colorize : true;

    var reporter = new reporters.ConsoleReporter(colorize);

    reporter.report(issues);
};

exports.StandardReporter = reporters.StandardReporter;
exports.SilentReporter = reporters.SilentReporter;
