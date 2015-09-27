"use strict";

// One-time setup for chai
let chai = require("chai"),
    fs = require("fs"),
    issueHandler = require("../index.js"),
    path = require("path");

chai.should();

/* global beforeEach, describe, it */

// jscs: disable requireMultipleVarDecl
// jscs: disable maximumLineLength

describe("Functional API", () =>
{
    let issues;

    function readFixture(filename)
    {
        return fs.readFileSync(path.join("test/fixtures", filename + ".txt"), "utf8");
    }

    function testIssues(count, name, categorizeFunc, message)
    {
        let code = require(`./fixtures/${name}.js`);

        let issue = code.run(issues),
            colorize = name !== "no-color";

        if (count === 1)
        {
            issue[categorizeFunc]().should.equal(true);
            issue.message.should.equal(message);
        }

        issues.length.should.equal(count);
        issueHandler.getFormattedIssues(issues, colorize).should.equal(readFixture(name));
    }

    beforeEach(() =>
    {
        issues = [];
    });

    it("addNote should create a Note instance and add it to issues", () =>
    {
        testIssues(1, "note", "isNote", "This is a note");
    });

    it("addWarning should create a Warning instance and add it to issues", () =>
    {
        testIssues(1, "warning", "isWarning", "This is a warning");
    });

    it("addError should create an Error instance and add it to issues", () =>
    {
        testIssues(1, "error", "isError", "This is an error");
    });

    it("multiple warnings and/or errors should all be printed", () =>
    {
        testIssues(4, "multiple");
    });

    it("passing colorize=false should generate uncolored output", () =>
    {
        testIssues(3, "no-color");
    });
});

// jscs: enable
