"use strict";

const
    acorn = require("acorn"),
    data = require("./_data.js"),
    functions = require("../../lib/functions.js");

exports.run = (issues) =>
{
    /*
        It's valid to pass a source line as { line: <source> } as the first argument to addX.
    */

    const
        node = new acorn.Node({ options: {} }, 5);

    node.end = 6;

    const line = functions.lineWithPosition(data.source, node.start);

    return issues.addError({ line }, data.file, node, data.message);
};
