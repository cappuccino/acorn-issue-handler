"use strict";

const
    data = require("./_data.js"),
    issueHandler = require("../../lib/index.js");

exports.run = (issues) =>
{
    issueHandler.setColorMap({
        file: null,
        message: null
    });

    issues.addNote(data.source, data.file, data.location, "This is a note");
    issues.addWarning(data.source, data.file, data.location, "This is a warning");
    issues.addError(data.source, data.file, data.location, "This is an error");
};
