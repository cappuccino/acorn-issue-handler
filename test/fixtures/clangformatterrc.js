"use strict";

const
    data = require("./_data.js"),
    fs = require("fs");

exports.run = (issues) =>
{
    fs.writeFileSync("./.clangformatterrc", fs.readFileSync("test/fixtures/.clangformatterrc"));
    issues.addNote(data.source, data.file, data.location, "This is a note");
    issues.addWarning(data.source, data.file, data.location, "This is a warning");
    issues.addError(data.source, data.file, data.location, "This is an error");
};
