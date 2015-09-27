"use strict";

let data = require("./_data.js"),
    issueHandler = require("../../index.js");

exports.run = (issues) =>
{
    issueHandler.addNote(issues, data.source, data.file, data.location, "This is a note");
    issueHandler.addWarning(issues, data.source, data.file, data.location, "This is a warning");
    issueHandler.addWarning(issues, data.source, data.file, data.location, "This is another warning");
    issueHandler.addError(issues, data.source, data.file, data.location, "This is an error");
};
