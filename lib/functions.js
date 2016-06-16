"use strict";

const
    acorn = require("acorn"),
    colors = require("./colors.js"),
    trimRight = require("lodash.trimright");

const stripLocRE = /^(.+)\s+\(\d+:\d+\)$/; // jscs: ignore requireMultipleVarDecl

// Functional API

exports.stripLocation = function(text)
{
    // Strip (line:column) from message
    let match = stripLocRE.exec(text);

    return match ? match[1] : text;
};

exports.findLineEnd = function(text, pos)
{
    acorn.lineBreakG.lastIndex = pos;

    const match = acorn.lineBreakG.exec(text);

    if (match)
        return match.index;

    return text.length;
};

exports.lineWithPosition = function(source, pos)
{
    const
        lineInfo = acorn.getLineInfo(source, pos),
        lineStart = pos - lineInfo.column,
        lineEnd = exports.findLineEnd(source, pos);

    return trimRight(source.substring(lineStart, lineEnd));
};

exports.setColorMap = map => colors.setColorMap(map);
exports.resetColorMap = () => colors.resetColorMap();
