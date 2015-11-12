"use strict";

const data = require("./_data.js");

exports.run = (issues) =>
{
    return issues.addWarning(data.source, data.file, data.location, data.message);
};
