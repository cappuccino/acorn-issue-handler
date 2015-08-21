"use strict";

var util = require("util");

// jscs: disable requireMultipleVarDecl

var StandardReporter = function(colorize)
{
    this.colorize = colorize === undefined ? true : !!colorize;
};

// jscs: enable

StandardReporter.prototype.report = function(issues)
{
    var output = "";

    if (issues.length > 0)
    {
        var warningCount = 0,
            errorCount = 0;

        for (var i = 0; i < issues.length; i++)
        {
            var issue = issues[i];

            if (issue.isWarning())
                ++warningCount;
            else if (issue.isError())
                ++errorCount;

            output += issue.getMessage(this.colorize);
        }

        var summary = "";

        if (warningCount > 0)
            summary += util.format("%d warning%s", warningCount, warningCount === 1 ? "" : "s");

        if (errorCount > 0)
        {
            if (summary)
                summary += " and ";

            summary += util.format("%d error%s", errorCount, errorCount === 1 ? "" : "s");
        }

        output += "\n" + summary + " generated.";
    }

    return output;
};

var ConsoleReporter = function(colorize)
{
    ConsoleReporter.super_.call(this, colorize);
};

util.inherits(ConsoleReporter, StandardReporter);

ConsoleReporter.prototype.report = function(issues)
{
    var output = "";

    if (issues.length)
    {
        output = ConsoleReporter.super_.prototype.report.call(this, issues);
        console.log(output);
    }

    return output;
};

var SilentReporter = function()
{
};

SilentReporter.prototype.report = function()
{
    // Stay silent!
    return "";
};

exports.StandardReporter = StandardReporter;
exports.ConsoleReporter = ConsoleReporter;
exports.SilentReporter = SilentReporter;
