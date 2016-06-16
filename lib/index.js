"use strict";

const
    functions = require("./functions.js"),
    issue = require("./issue.js"),
    IssueList = require("./issuelist.js"),
    reporters = require("./reporters");

exports.isIssue = issue.isIssue;
exports.lineWithPosition = functions.lineWithPosition;
exports.resetColorMap = functions.resetColorMap;
exports.setColorMap = functions.setColorMap;
exports.stripLocation = functions.stripLocation;

exports.Note = issue.Note;
exports.Warning = issue.Warning;
exports.Error = issue.Error;
exports.IssueList = IssueList;
exports.reporters = reporters;
