"use strict";


const data = require("./_data.js");

exports.run = (issues) =>
{
    issues.addError(
        "let x = 7,\n    y = 13,\n    z = 27;\n",
        "test.js",
        { start: 15, end: 16 },
        data.message
    );

    const source = `-(void)test:(int)arg
{
    console.log(arg);
}
`;

    issues.addError(source, "test.js", { start: 0, end: source.length }, "duplicate method definition");
};
