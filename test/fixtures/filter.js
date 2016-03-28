"use strict";

const data = require("./_data.js");

exports.run = (issues) =>
{
    issues.addNote(data.source, data.file, data.location, "This is a note");
    issues.addWarning(data.source, data.file, data.location, "This is a warning");
    issues.addWarning(data.source, data.file, data.location, "This is another warning");
    issues.addError(data.source, data.file, data.location, "This is an error");

    issues.filter(issue => !issue.isWarning());
};
