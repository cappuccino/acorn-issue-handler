"use strict";

const
    acorn = require("acorn"),
    capture = require("capture-stream"),
    expect = require("code").expect,
    data = require("./fixtures/_data.js"),
    fs = require("fs"),
    issueHandler = require("../lib/index.js"),
    path = require("path");

/* eslint-disable no-unused-expressions */

// jscs: disable maximumLineLength

describe("API", () =>
{
    let issues;

    function readFixture(filename)
    {
        return fs.readFileSync(path.join("test/fixtures", `${filename}.txt`), "utf8");
    }

    function testIssues(count, name, categorizeFunc)
    {
        const code = require(`./fixtures/${name}.js`);

        const issue = code.run(issues); // jscs: ignore requireMultipleVarDecl

        let options;

        switch (name)
        {
            case "no-color":
                options = false;
                break;

            case "clangformatterrc":
                // leave colorize undefined
                break;

            case "options":
                options = JSON.parse(fs.readFileSync("test/fixtures/.clangformatterrc"));
                break;

            default:
                options = true;
        }

        if (count === 1)
        {
            expect(issueHandler.isIssue(issue)).to.be.true();
            expect(issue[categorizeFunc]()).to.be.true();
            expect(issue.message).to.equal(data.message);
        }

        expect(issues).to.have.length(count);
        expect(issues.issues).to.have.length(count);
        expect(issues.render(options)).to.equal(readFixture(name));

        // In case the code changed the color map
        issueHandler.resetColorMap();
    }

    beforeEach(() =>
    {
        issues = new issueHandler.IssueList();
    });

    it("should create a Note instance and add it to an issue list when calling addNote", () =>
    {
        testIssues(1, "note", "isNote");
    });

    it("should create a Warning instance and add it to an issue list when calling addWarning", () =>
    {
        testIssues(1, "warning", "isWarning");
    });

    it("should create an Error instance and add it to an issue list when calling addError", () =>
    {
        testIssues(1, "error", "isError");
    });

    it("should use util.format to format the message and following args when calling addError", () =>
    {
        const issue = issues.addError(
                data.source,
                data.file,
                data.location,
                "I have %d good reasons why %s is %s",
                13,
                "WebStorm",
                "great"
            );

        expect(issue.message).to.equal("I have 13 good reasons why WebStorm is great");
    });

    it("should return formatted text for an issue list when calling IssueList#render", () =>
    {
        testIssues(4, "multiple");

        expect(issues.warningCount).to.equal(2);
        expect(issues.errorCount).to.equal(1);
    });

    it("should generate uncolored output when passing colorize=false to IssueList#render", () =>
    {
        testIssues(3, "no-color");
    });

    it("should change the output colors when calling setColorMap with { element: string }", () =>
    {
        testIssues(3, "setColorMap-strings");
    });

    it("should change the output colors when calling setColorMap with { element: chalk function }", () =>
    {
        testIssues(3, "setColorMap-funcs");
    });

    it("should change the output colors when calling IssueList#render with an options object", () =>
    {
        testIssues(3, "options");
    });

    it("should change the output colors when .clangformatterrc is present", () =>
    {
        try
        {
            testIssues(3, "clangformatterrc");
        }
        finally
        {
            fs.unlinkSync("./.clangformatterrc");
        }
    });

    it("should remove color for an element when calling setColorMap with { element: null }", () =>
    {
        testIssues(3, "setColorMap-null");
    });

    it("should ignore an element when calling setColorMap with invalid element name or style", () =>
    {
        testIssues(3, "setColorMap-invalid");
    });

    it("should correctly determine the current line of text", () =>
    {
        testIssues(1, "current-line", "isError");
    });

    it("should work with chai.throw", () =>
    {
        function throwIt()
        {
            throw issues.addError(data.source, data.file, data.location, "This is an error");
        }

        expect(throwIt).to.throw(issueHandler.Error, "This is an error");
    });

    it("should consider valid location to be acorn.Node|acorn.SourceLocation|acorn SyntaxError|{start, end}|number", () =>
    {
        testIssues(5, "location");
    });

    it("should convert SyntaxError thrown by acorn to an Error with no (line:column) in the message when calling addAcornError", () =>
    {
        try
        {
            acorn.parse(data.source);
        }
        catch (ex)
        {
            const issue = issues.addAcornError(ex, data.source, data.file);

            expect(issue.message).to.equal("Identifier directly after number");
            expect(issue.lineInfo.line).to.equal(1);
            expect(issue.lineInfo.column).to.equal(5);
        }
    });

    it("should filter out internal calls when calling getStackTrace with no filter", () =>
    {
        let issue = issues.addError(data.source, data.file, data.location, data.message);

        expect(issue.getStackTrace()).to.match(/^Error: identifier directly after number\n\s+ at Context\.<anonymous>/);

        try
        {
            acorn.parse(data.source);
        }
        catch (ex)
        {
            issue = issues.addAcornError(ex, data.source, data.file);
            expect(issue.getStackTrace()).to.match(/^SyntaxError: Identifier directly after number\n\s+ at Context\.<anonymous>/);
        }

        // stripLocation is called for code coverage
        issue = new issueHandler.Error(data.source, data.file, data.location, issueHandler.stripLocation(data.message));
        expect(issue.getStackTrace()).to.match(/^Error: identifier directly after number\n\s+ at Context\.<anonymous>/);

        issue = new issueHandler.Warning(data.source, data.file, data.location, data.message);
        expect(issue.getStackTrace()).to.match(/^Warning: identifier directly after number\n\s+ at Context\.<anonymous>/);

        issue = new issueHandler.Note(data.source, data.file, data.location, data.message);
        expect(issue.getStackTrace()).to.match(/^Note: identifier directly after number\n\s+ at Context\.<anonymous>/);
    });

    it("should filter out calls at or above those passed to getStackTrace in the filter parameter", () =>
    {
        try
        {
            acorn.parse(data.source);
        }
        catch (ex)
        {
            const issue = issues.addAcornError(ex, data.source, data.file);

            expect(issue.getStackTrace(["Test\\.Runnable\\.run"])).to.match(/^SyntaxError: Identifier directly after number\n\s+ at Runner\.runTest/);
        }
    });

    it("should perform default filtering when filters passed to getStackTrace do not match", () =>
    {
        try
        {
            acorn.parse(data.source);
        }
        catch (ex)
        {
            const
                issue = issues.addAcornError(ex, data.source, data.file),
                defaultStackTrace = issue.getStackTrace();

            expect(defaultStackTrace).to.equal(issue.getStackTrace(["foo\\.bar"]));
        }
    });

    it("should log an issue list to the console when calling IssueList#log", () =>
    {
        require("./fixtures/multiple.js").run(issues);

        const restore = capture(process.stdout);

        issues.log(true);

        const output = restore(true);

        // Add \n because console.log adds it
        expect(output).to.equal(readFixture("multiple") + "\n");
    });

    it("should return an empty string when calling IssueList#render with an empty list", () =>
    {
        expect(issues.render()).to.be.empty();
    });

    it("should do nothing when calling IssueList#log with an empty list", () =>
    {
        const restore = capture(process.stdout);

        issues.log();
        expect(restore()).to.be.empty();
    });

    it("should return an empty string from SilentReporter#report", () =>
    {
        const reporter = new issueHandler.SilentReporter();

        issues.addError(data.source, data.file, data.location, data.message);
        expect(reporter.report()).to.be.empty();
    });
});
