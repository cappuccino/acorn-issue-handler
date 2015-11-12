"use strict";

const data = require("./_data.js");

exports.run = (issues) =>
{
    return issues.addError(
        "let x = 7,\n    y = 13,\n    z = 27;\n",
        "test.js",
        { start: 15, end: 16 },
        data.message
    );
};
