"use strict";

const
    data = require("./_data.js"),
    issueHandler = require("../../lib/index.js");

exports.run = (issues) =>
{
    issueHandler.setColorMap({
        note: "foo.bar", // invalid style
        warning: "foo.bar", // invalid style
        error: "foo.bar", // invalid style
        loc: "green.bold", // invalid key
        message: "gray.bold" // valid
    });

    issues.addNote(data.source, data.file, data.location, "This is a note");
    issues.addWarning(data.source, data.file, data.location, "This is a warning");
    issues.addError(data.source, data.file, data.location, "This is an error");
};
