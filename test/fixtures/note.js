"use strict";

let data = require("./_data.js"),
    issueHandler = require("../../index.js");

exports.run = (issues) =>
{
    return issueHandler.addNote(issues, data.source, data.file, data.location, "This is a note");
};
