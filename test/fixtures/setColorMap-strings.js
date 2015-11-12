"use strict";

const
    data = require("./_data.js"),
    issueHandler = require("../../lib/index.js");

exports.run = (issues) =>
{
    issueHandler.setColorMap({
        file: "bgBlue.yellow",
        location: "blue.underline",
        error: "bgRed",
        warning: "bgMagenta",
        note: "bgYellow.magenta",
        message: "bgGreen.bold",
        separator: "green",
        source: "inverse",
        caret: "cyan.bold"
    });

    issues.addNote(data.source, data.file, data.location, "This is a note");
    issues.addWarning(data.source, data.file, data.location, "This is a warning");
    issues.addError(data.source, data.file, data.location, "This is an error");
};
