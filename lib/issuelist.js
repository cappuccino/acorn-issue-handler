"use strict";

const
    functions = require("./functions.js"),
    issues = require("./issue.js"),
    reporters = require("./reporters.js"),
    util = require("util");

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
        const args = Array.prototype.slice.call(arguments, 5);

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

        // eslint-disable-next-line prefer-spread
        return this.addIssue.apply(this, newArgs);
    }

    /* eslint-disable no-unused-vars */

    addNote(source, file, location, message)
    {
        return this.addFromArgs(issues.Note, arguments);
    }

    addWarning(source, file, location, message)
    {
        return this.addFromArgs(issues.Warning, arguments);
    }

    addError(source, file, location, message)
    {
        return this.addFromArgs(issues.Error, arguments);
    }

    /* eslint-enable */

    addAcornError(error, source, file)
    {
        // Make a fake location object that contains the start position of the error
        const
            location = {
                start: error.pos,
                end: error.pos,
                loc: {
                    line: error.loc.line,
                    column: error.loc.column
                }
            },
            message = functions.stripLocation(error.message),
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

    filter(callback)
    {
        this._issues = this._issues.filter(callback, this);
    }
}

module.exports = IssueList;
