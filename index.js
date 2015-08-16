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

var Issue = exports.Issue = function(source, sourcePath, node, message, severity)
{
    if (node.loc)
    {
        this.lineInfo = {
            line: node.loc.line,
            column: node.loc.column
        };
    }
    else
        this.lineInfo = acorn.getLineInfo(source, node.start);

    this.lineInfo.lineStart = node.start - this.lineInfo.column;
    this.lineInfo.lineEnd = findLineEnd(source, node.end);
    this.lineInfo.sourceLength = source.length;
    this.source = trimRight(source.substring(this.lineInfo.lineStart, this.lineInfo.lineEnd));
    this.sourcePath = sourcePath;
    this.highlightedNodes = [];
    this.message = message || "";
    this.severity = severity;
    this.name = "Issue";
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

Issue.prototype.getMessage = function(colorize)
{
    var enabled = chalk.enabled;

    colorize = colorize === undefined ? true : !!colorize;
    chalk.enabled = colorize;

    if (!messageTemplate)
    {
        messageTemplate = lodashTemplate(
            "${data.context} ${data.severity} ${data.message}\n" +
            "${data.source}\n" +
            "${data.highlights}",
            { variable: "data" }
        );
    }

    var context = util.format("%s:%d:%d:", this.sourcePath, this.lineInfo.line, this.lineInfo.column + 1),
        coloredContext = chalk[colorMap.message](context),
        severity = chalk[colorMap[this.severity]](this.severity + ":"),
        highlights = repeat(" ", this.source.length);

    for (var i = 0; i < this.highlightedNodes.length; i++)
    {
        var node = this.highlightedNodes[i];

        // Make sure the highlight is in range of the source line
        if (node.start >= this.lineInfo.lineStart &&
            node.start < (this.lineInfo.lineStart + this.lineInfo.sourceLength))
        {
            var offset = node.start - this.lineInfo.lineStart,
                length = node.end - node.start;

            highlights = highlights.substring(0, offset) +
                         chalk[colorMap.highlight](repeat("‾", length)) +
                         highlights.substring(offset + length);
        }
    }

    highlights = highlights.substring(0, this.lineInfo.column) +
                 chalk[colorMap.caret]("^") +
                 trimRight(highlights.substring(this.lineInfo.column + 1));

    var message = messageTemplate(
            {
                context: coloredContext,
                severity: severity,
                message: chalk[colorMap.message](this.message),
                source: this.source,
                highlights: highlights
            }
        );

    chalk.enabled = enabled;

    return message;
};

Issue.prototype.addHighlight = function(node)
{
    this.highlightedNodes.push(node);
};

exports.Note = function(source, sourcePath, node, message)
{
    exports.Note.super_.call(this, source, sourcePath, node, message, "note");
    this.name = "Note";
};

util.inherits(exports.Note, Issue);

exports.Warning = function(source, sourcePath, node, message)
{
    exports.Warning.super_.call(this, source, sourcePath, node, message, "warning");
    this.name = "Warning";
};

util.inherits(exports.Warning, Issue);

exports.Error = function(source, sourcePath, node, message)
{
    exports.Error.super_.call(this, source, sourcePath, node, message, "error");
    this.name = "Error";
};

util.inherits(exports.Error, Issue);

exports.FatalError = function(source, sourcePath, node, message)
{
    exports.FatalError.super_.call(this, source, sourcePath, node, message || "a fatal error occurred", "error");
    this.name = "FatalError";
};

util.inherits(exports.FatalError, exports.Error);

exports.InternalError = function(source, sourcePath, node, message)
{
    exports.InternalError.super_.call(this, source, sourcePath, node, message || "an internal error occurred", "error");
    this.name = "InternalError";
};

util.inherits(exports.InternalError, exports.FatalError);

exports.addIssue = function(issues, Class, source, sourcePath, node, args)
{
    // If addIssue is called directly, args is the message, optionally
    // followed by format args. Otherwise it was called by addNote etc.
    // and args is the arguments passed to those methods.
    if (typeof args === "string")
        args = Array.prototype.slice.call(arguments, 5);
    else
        args = Array.prototype.slice.call(args, 4);

    var issue = new Class(
            source,
            sourcePath,
            node,
            util.format.apply(null, args)
        );

    issues.push(issue);

    return issue;
};

exports.addNote = function(issues, source, sourcePath, node)
{
    return exports.addIssue(issues, exports.Note, source, sourcePath, node, arguments);
};

exports.addWarning = function(issues, source, sourcePath, node)
{
    return exports.addIssue(issues, exports.Warning, source, sourcePath, node, arguments);
};

exports.addError = function(issues, source, sourcePath, node)
{
    return exports.addIssue(issues, exports.Error, source, sourcePath, node, arguments);
};

exports.addFatalError = function(issues, source, sourcePath, node)
{
    exports.addIssue(issues, exports.FatalError, source, sourcePath, node, arguments);
    throw new exports.FatalError();
};

exports.addInternalError = function(issues, source, sourcePath, node)
{
    exports.addIssue(issues, exports.InternalError, source, sourcePath, node, arguments);
    throw new exports.InternalError();
};

var stripLocRE = /^(.+)\s*\(\d+:\d+\)$/;

exports.addAcornError = function(issues, error, source, sourcePath)
{
    // Make a fake node object that contains the start position of the error
    var node = {
            start: error.pos,
            end: error.pos,
            loc: { line: error.loc.line, column: error.loc.column }
        },
        message = error.message.charAt(0).toLowerCase() + error.message.substr(1),

        // Strip (line:column) from message
        match = stripLocRE.exec(message);

    if (match)
        message = match[1];

    return exports.addError(
        issues,
        source,
        sourcePath,
        node,
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

exports.logIssues = function(issues, colorize)
{
    colorize = arguments.length > 1 ? !!colorize : true;

    var reporter = new reporters.StandardReporter(colorize);

    reporter.report(issues);
};

exports.StandardReporter = reporters.StandardReporter;
exports.SilentReporter = reporters.SilentReporter;
