"use strict";

const
    chalk = require("chalk"),
    data = require("./_data.js"),
    issueHandler = require("../../lib/index.js");

exports.run = (issues) =>
{
    issueHandler.setColorMap(new Map([
        ["file", chalk.bgBlue.yellow],
        ["location", chalk.yellow],
        ["error", chalk.bgRed],
        ["warning", chalk.bgMagenta],
        ["note", chalk.bgYellow.magenta],
        ["message", chalk.bgGreen.bold],
        ["separator", chalk.green],
        ["source", chalk.inverse],
        ["caret", chalk.cyan.bold]
    ]));

    issues.addNote(data.source, data.file, data.location, "This is a note");
    issues.addWarning(data.source, data.file, data.location, "This is a warning");
    issues.addError(data.source, data.file, data.location, "This is an error");
};
