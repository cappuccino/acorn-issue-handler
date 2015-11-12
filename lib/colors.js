"use strict";

let chalk = require("chalk");

const kDefaultColorMap = new Map([
    ["file", chalk.cyan.bold],
    ["location", null],
    ["error", chalk.red.bold],
    ["warning", chalk.magenta.bold],
    ["note", chalk.yellow.bold],
    ["message", chalk.bold],
    ["separator", chalk.dim],
    ["source", null],
    ["caret", chalk.green.bold]
]);

let colorMap = new Map(kDefaultColorMap);

exports.setColorMap = function(map)
{
    function parseStyle(style)
    {
        if (typeof style === "string")
        {
            let parsedStyle = chalk;

            for (let element of style.split("."))
            {
                parsedStyle = parsedStyle[element];

                if (parsedStyle === undefined)
                    return undefined;
            }

            return parsedStyle;
        }

        return style;
    }

    exports.resetColorMap();

    let isMap = map.constructor === Map,
        keys = isMap ? map.keys() : Object.keys(map);

    for (let key of keys)
    {
        if (colorMap.has(key))
        {
            let style = parseStyle(isMap ? map.get(key) : map[key]);

            if (style !== undefined)
                colorMap.set(key, style);
        }
    }
};

exports.resetColorMap = function()
{
    colorMap = new Map(kDefaultColorMap);
};

exports.colorizeText = function(color, text)
{
    let func = colorMap.get(color);

    if (func)
    {
        // enabled flag is in func
        func.enabled = true;

        return func(text);
    }

    return text;
};
