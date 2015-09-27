"use strict";

/** @class */
class StandardReporter
{
    constructor(colorize)
    {
        this.colorize = colorize === undefined ? true : !!colorize;
    }

    report(issues)
    {
        if (issues.length === 0)
            return "";

        let output = "",
            warningCount = 0,
            errorCount = 0;

        for (let issue of issues)
        {
            if (issue.isWarning())
                ++warningCount;
            else if (issue.isError())
                ++errorCount;

            output += issue.getFormattedMessage(this.colorize);
        }

        let summary = "";

        if (warningCount > 0)
            summary += `${warningCount} warning${warningCount === 1 ? "" : "s"}`;

        if (errorCount > 0)
        {
            if (summary)
                summary += " and ";

            summary += `${errorCount} error${errorCount === 1 ? "" : "s"}`;
        }

        if (summary)
            output += "\n" + summary + " generated.";

        return output;
    }
}

/** @class */
class ConsoleReporter extends StandardReporter
{
    constructor(colorize)
    {
        super(colorize);
    }

    report(issues)
    {
        let output = "";

        if (issues.length)
        {
            output = super.report(issues);
            console.log(output);
        }

        return output;
    }
}

/** @class */
class SilentReporter extends StandardReporter
{
    report()
    {
        return "";
    }
}

exports.StandardReporter = StandardReporter;
exports.ConsoleReporter = ConsoleReporter;
exports.SilentReporter = SilentReporter;
