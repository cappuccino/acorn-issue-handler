"use strict";

const
    acorn = require("acorn"),
    data = require("./_data.js");

exports.run = (issues) =>
{
    /*
        Valid location:

        acorn.Node
        acorn.SourceLocation
        acorn SyntaxError
        {start, end}
        number
    */

    const
        node = new acorn.Node({ options: {} }, 5),
        loc = new acorn.SourceLocation({}, 5, 6),
        obj = { start: 5, end: 6 },
        number = 5;

    node.end = 6;
    issues.addError(data.source, data.file, node, data.message);
    issues.addError(data.source, data.file, loc, data.message);

    try
    {
        acorn.parse(data.source);
    }
    catch (ex)
    {
        issues.addError(data.source, data.file, ex, data.message);
    }

    issues.addError(data.source, data.file, obj, data.message);
    issues.addError(data.source, data.file, number, data.message);
};
