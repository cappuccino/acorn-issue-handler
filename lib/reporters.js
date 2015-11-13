"use strict";

const
    chalk = require("chalk"),
    colors = require("./colors.js"),
    fs = require("fs"),
    homedir = require("home-dir"),
    path = require("path"),
    pathExists = require("path-exists").sync;

/** @class */
class StandardReporter
{
    constructor(options)
    {
        let colorize;

        if (typeof options === "object")
            this.config = options;
        else
        {
            if (typeof options === "boolean")
                colorize = options;

            this.config = this.constructor.loadConfig();
        }

        this.colorize = colorize === undefined ? this.constructor.shouldColorize(this.config) : colorize;

        if (this.colorize && typeof this.config.colors === "object")
            colors.setColorMap(this.config.colors);
    }

    /**
     * Format a list of issues with a summary.
     * @param {(IssueList|object[])} issues
     * @returns {string}
     */
    report(issues)
    {
        if (issues.length === 0)
            return "";

        let output = "\n",
            warningCount = 0,
            errorCount = 0;

        for (let issue of issues)
        {
            if (issue.isWarning())
                ++warningCount;
            else if (issue.isError())
                ++errorCount;

            output += this.renderIssue(issue);
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
        {
            const
                colorizeText = this.colorize ? colors.colorizeText : (color, text) => text,
                summaryColor = errorCount > 0 ? "error" : "warning";

            output += colorizeText(summaryColor, `\n${summary} generated.`);
        }

        return output;
    }

    renderIssue(issue)
    {
        // istanbul ignore next
        let colorize = this.colorize === undefined ? true : !!this.colorize;

        const
            colorizeText = colorize ? colors.colorizeText : (color, text) => text,
            file = colorizeText("file", issue.file),
            location = colorizeText("location", `${issue.lineInfo.line}:${issue.lineInfo.column + 1}`),
            sep = colorizeText("separator", ":"),
            severity = colorizeText(issue.severity, issue.severity),
            caret = " ".repeat(issue.lineInfo.column) + colorizeText("caret", "^"),
            message = colorizeText("message", issue.message.charAt(0).toLowerCase() + issue.message.substr(1)),
            source = colorizeText("source", issue.source);

        return `${file}${sep}${location}${sep} ${severity}${sep} ${message}\n${source}\n${caret}\n`;
    }

    static shouldColorize(config)
    {
        return (config && typeof config.colorize === "boolean") ? config.colorize : chalk.enabled;
    }

    static loadConfig()
    {
        const home = homedir();

        let dir = process.cwd(),
            visitedHome = false,
            rcPath;

        while (true)
        {
            // istanbul ignore next: no need to test this
            if (dir === home)
                visitedHome = true;

            rcPath = path.join(dir, ".clangformatterrc");

            if (pathExists(rcPath))
                return JSON.parse(fs.readFileSync(rcPath, "utf8"));

            const previousDir = dir;

            dir = path.dirname(dir);

            // If it hasn't changed, we were at the root
            if (dir === previousDir)
                break;
        }

        // istanbul ignore next: no need to test this
        if (!visitedHome)
        {
            rcPath = path.join(home, ".clangformatterrc");

            if (pathExists(rcPath))
                return JSON.parse(fs.readFileSync(rcPath, "utf8"));
        }

        return {};
    }
}

/** @class */
class ConsoleReporter extends StandardReporter
{
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
    report(issues) // eslint-disable-line no-unused-vars
    {
        return "";
    }
}

exports.StandardReporter = StandardReporter;
exports.ConsoleReporter = ConsoleReporter;
exports.SilentReporter = SilentReporter;
