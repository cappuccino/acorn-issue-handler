acorn-issue-handler
===================

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Dependencies status][dependencies-image]][dependencies-url]

This module provides robust error tracking and reporting for errors arising from [acorn] parsing or from compilers which use an acorn AST.

There are three types of issues supported by this module: error, warning, and note. There are simple methods provided to add an issue of each type. In addition, there is a method to add a `SyntaxError` thrown by acorn to a list of issues.

When you want a formatted dump, there is a single method you can call to either retrieve formatted (and optionally colorized) text, or to log formatted text to the console.

Here's an example of formatted output:

![ ](errors.png)


## Installation

If `acorn` is not already installed, install it with `npm`:

```
$ npm install acorn --save
```

Then install this module with `npm`:

```
$ npm install acorn-issue-handler --save
```


## Usage

Usage is quite simple:

1. Instantiate an `IssueList`.
2. Call `addError`, `addWarning`, or `addNote` methods on the list.
3. When you are ready to get or log a formatted issue list, call the `render` or `log` method on the list.

That's all there is to it. Here's some example code:

```js
const issueHandler = require('acorn-issue-handler');

class Compiler
{
    constructor()
    {
        this.issues = new issueHandler.IssueList();
    }

    compileMethodStatement(node, scope, compileNode)
    {
        const
            name = node.id.name,
            duplicate = this.currentClass.methods[name];

        if (duplicate)
        {
            this.issues.addError(
                this.source,
                this.file,
                node,
                "duplicate definition of method '%s'",
                selector
            );

            this.issues.addNote(
                this.source,
                this.file,
                duplicate.node,
                "original definition is here:"
            );
        }
    }

    // and so on
}

const compiler = new Compiler(source, file);

compiler.compile();

if (compiler.issues.length > 0)
    issues.log();
```


## Classes

The API is built on three key classes, `IssueList`, `Issue` and `Reporter`, along with their subclasses. Typically the only class you instantiate or work with directly is `IssueList`, but if you have more complex needs you can instantiate the other classes.

### IssueList

This class manages an array of [Issue](#issueextends-syntaxerror) instances and provides methods for adding, querying, and rendering the issues.


#### constructor()

Instantiates a new issue list.


#### addError/addWarning/addNote(source, file, location, message, ...)

These methods add an issue of the appropriate subclass to the issue list and return the issue instance. The parameters are as follows:

 * **source** - The source code in which the issue occurred.
 * **file** - The path to the source code. This is not checked in any way for validity, so it may be virtual, for example "\<command line>".
 * **location** - Where the issue occurred. This may be:
    - An `acorn.Node` object
    - An `acorn.SourceLocation` object
    - A `SyntaxError` thrown by acorn
    - Any object which has zero-based `start` and `end` properties which are indexes into `source`
    - A number which represents a zero-based index into `source`.
 * **message** - The message to display to the user.

As a convenience, `message` may be a format string in the form used by [util.format](https://nodejs.org/api/util.html#util_util_format_format), followed by the arguments for the format string. For example:

```js
issues.addError(
    source,
    file,
    superclassNode,
    "cannot find implementation declaration for '%s', superclass of '%s'",
    superclassNode.name,
    name
);
```


#### addAcornError(error, source, file)

Converts a `SyntaxError` thrown by `acorn` (which has added location information) into an [Error](#errorextends-issue) instance, adds the instance to the issue list, and returns the instance. Typically you would use it like this:

```js
let issues = new issueHandler.IssueList(),
    ast;

try
{
    ast = acorn.parse(source, options);
}
catch (ex)
{
    if (ex instanceof SyntaxError)
        issues.addAcornError(ex, source, file);
}

if (issues.length > 0)
    issues.log();
```


#### issues  \[read-only property]

Returns the array of `Issue` instances managed by the issue list.


#### *\[Symbol.iterator]()

Returns an iterator for the array of issues managed by the issue list.


#### length  \[read-only property]

Returns the number of issues in the issue list.


#### errorCount  \[read-only property]

Returns the number of issues for which `isError` returns `true`.


#### warningCount  \[read-only property]

Returns the number of issues for which `isWarning` returns `true`.


#### render(options)

This convenience method instantiates a [StandardReporter](#standardreporter) with `options`, calls its `report` method, and returns the result.


#### log(options)

This convenience method instantiates a [ConsoleReporter](#consolereporteroptions-extends-standardreporter) with `options`, calls its `report` method, and returns the result.


#### filter(callback)

Filters the issue list according to `callback`, which should conform to the `Array.prototype.filter` callback protocol. Within `callback`, `this` is the issue list.

--

### Issue \[extends SyntaxError]

This is the base class for the three types of issues: error, warning and note. Typically you will never instantiate this class, but rather one of its subclasses.


#### constructor(source, file, location, message, severity) \[extends SyntaxError]

Instantiates an instance which contains information about where the issue occurred.

 * **source** - The source code in which the issue occurred.
 * **file** - The path to the source code. This is not checked in any way for validity, so it may be virtual, for example '<command line>'.
 * **location** - Where the issue occurred. This may be:
    - An `acorn.Node` object
    - An `acorn.SourceLocation` object
    - A `SyntaxError` thrown by acorn
    - Any object which has zero-based `start` and `end` properties which are indexes into `source`
    - A number which represents a zero-based index into `source`.
 * **message** - The message to display to the user.
 * **severity** - Should be "error", "warning" or "note".


#### isError()

Returns `true` if the object is an instance of this module's `Error` class (not the global `Error` class).


#### isWarning()

Returns `true` if the object is an instance of this module's `Warning` class.


#### isNote()

Returns `true` if the object is an instance of this module's `Note` class.


#### getStackTrace(filter)

Returns a stack trace for this issue, filtering out function calls within this module. If you wish to filter out all function calls above one of your own functions, `filter` is an array of strings representing function names that might appear in the stack trace. If one of the names in `filter` appears in the stack trace, that call and all those above it will be filtered out. A regex is used for matching, so be sure to regex escape the text in `filter`, for example: `['Parser\\.acorn.Parser\\.objj_raise']`.

--

### Error \[extends Issue]

A subclass of `Issue` that represents an error.


#### constructor(source, file, location, message)

Instantiates an `Error` and sets the severity to "error".

--

### Warning \[extends Issue]

A subclass of `Issue` that represents a warning.


#### constructor(source, file, location, message)

Instantiates a `Warning` and sets the severity to "warning".

--

### Note \[extends Issue]

A subclass of `Issue` that represents a note.


#### constructor(source, file, location, message)

Instantiates a `Note` and sets the severity to "note".

--

### StandardReporter

This is the usual class used to render formatted output from an issue list. Normally you would not instantiate this class directly, but use the `IssueList#render` method instead.


#### constructor(options)

If no arguments are passed or `options` is `true`, the output will be colorized. If `options` is an object, it is used to configure colorizing. See [Customizing colors](#customizingcolors) for more info.


#### report(issues)

Given an `IssueList`, this method renders each issue in the list, adds a summary of how many errors and/or warnings there were, and returns the resulting string. If `issues.length` is zero, an empty string is returned.

Each issue is rendered into a representation of its message within its context. A rendered issue has the following structure:

```
<file>:<location>: <severity>: <message>
<source>
<caret>
```

The elements of the rendering are:

- **file** - The filename passed to `addNote/addWarning/addError`.
- **location** - The one-based line:column within the entire source where the issue occurred.
- **severity** - "error", "warning", or "note".
- **message** - The formatted message passed to `addNote/addWarning/addError`.
- **source** - The line of code within the entire source where the issue occurred.
- **caret** - `^` marks the position within `<source>` where the error occurred.
- **separator** - The ":" characters in the first line are colorized with the "separator" color in the color map.

You can configure whether the result is colorized and what colors are used in several ways. For more information, see [Customizing colors](#customizingcolors).

--

### ConsoleReporter \[extends StandardReporter]

This is the usual class used to log formatted output from an issue list to the console. Normally you would not instantiate this class directly, but use the `IssueList#log` method instead.


#### constructor(options)

Same as `StandardReporter#constructor`.


#### report(issues)

This method calls `StandardReporter#report`, and if `issues.length` is not zero, logs the result to the console. The result is returned. If `issues.length` is zero, an empty string is returned.

--

### SilentReporter \[extends StandardReporter]

The `report` method of this subclass does nothing. By using this reporter, you can suppress issue logging without changing any other code.


## Customizing colors

There are three ways to configure the colors used by the reporter:

- By using a `.clangformatterrc` configuration file.
- By passing color configuration in the `options` parameter.
- By calling `setColorMap`.

In all three cases, the colors are configured using a **color map**.

### Color maps

This module uses [chalk](https://github.com/chalk/chalk) to colorize its output. By default, the elements of a rendered issue are colorized with the following `chalk` colors (`null` means no colorizing):

Name      | Color
:-------  | :-----
file      | cyan.bold
location  | null
error     | red.bold
warning   | magenta.bold
note      | yellow.bold
message   | bold
separator | dim
source    | null
caret     | green.bold

For more information on what the elements of a formatted message are, see the `StandardReporter#report` method. Note that "error", "warning" and "note" in the table above represent the three possible values for the `<severity>` element.

When configuring the colors used by the reporter, you use a color map, which maps names in the table above to strings which are the equivalent of the dotted `chalk` function, but without the "chalk." prefix. Here is an example:

```js
{
    file: "bgBlue.yellow",
    location: "yellow",
    error: "bgRed",
    warning: "bgMagenta",
    note: "bgYellow.magenta",
    message: "bgGreen.bold",
    separator: "green",
    source: "inverse",
    caret: "cyan.bold"
}
```

You do not need to set all of the values in the map if you only wish to override a few colors; only the elements whose keys are in the map will be affected. To turn off colorizing for an element, pass `null` as the value. Invalid element keys or styles will cause that item in the map to be ignored.

Note that configuring colors by any method changes the colors for all modules that require this module in a given execution. If you want to be sure you are starting from the default colors, use the [resetColorMap](#resetcolormap) function.


### Using a config file

If no color map is passed in the `options` parameter to `IssueList#render`, `IssueList#log`, or one of the reporter constructors, the reporter looks for a config object in a `.clangformatterrc` file. The reporter searches for this file starting at the current working directory, then traversing up to the root of the filesystem. If the current user's home directory was not traversed, that is searched as well.

A sample `.clangformatterrc` looks like this:

```json
{
    "colorize": true,
    "colors": {
        "file": "yellow.bold",
        "message": "magenta.bold",
        "caret": "white.bgGreen"
    }
}
```

There are several possible properties in a formatter config object:

**colorize**<br>
Output is colorized by default. If this property is set to a boolean, its value is used to determine colorizing.

**colors**<br>
If this property is an object, it should be a color map in JSON format (the keys must be quoted strings). If colorization is off, this property is ignored.


### Configuring via `options`

You can configure colorization by passing a value in the `options` parameter to `IssueList#render`, `IssueList#log`, or one of the reporter constructors.

- If `options` is a boolean, colorizing will be turned on or off accordingly, and the default colors will be used.
- If `options` is an object, it may contain a `colorize` boolean property and/or a `colors` property which should be a color map.


### setColorMap(map)

If you wish to explicitly set the color map, you may do so **after** instantiating a reporter and **before** calling the `report` method.

`map` can be an object or an ES6 `Map`, and the values can either be strings or `chalk` functions. If you use strings, they should be the equivalent of the dotted `chalk` function, but without the "chalk." prefix. For example, these two calls have the same effect:

```js
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

issueHandler.setColorMap({
    file: "bgBlue.yellow",
    location: "yellow",
    error: "bgRed",
    warning: "bgMagenta",
    note: "bgYellow.magenta",
    message: "bgGreen.bold",
    separator: "green",
    source: "inverse",
    caret: "cyan.bold"
});
```

`resetColorMap` is called before applying `map`, so any elements you do not specify in `map` will use the default color.

Note that calling this method changes the colors for all modules that require this module in a given execution.


### resetColorMap()

Resets the color map to the defaults. Note that calling this method changes the colors for all modules that require this module in a given execution.


## Utilities

### stripLocation(message)

Strips `(line:column)` from the message of a `SyntaxError` thrown by acorn. If you use `IssueList#addAcornError`, this is done for you.


[acorn]: https://github.com/marijnh/acorn

[npm-image]: http://img.shields.io/npm/v/acorn-issue-handler.svg?style=flat-square
[npm-url]: https://npmjs.org/package/acorn-issue-handler

[travis-image]: https://img.shields.io/travis/cappuccino/acorn-issue-handler.svg?style=flat-square
[travis-url]: https://travis-ci.org/cappuccino/acorn-issue-handler

[dependencies-image]: https://img.shields.io/gemnasium/cappuccino/acorn-issue-handler.svg?style=flat-square
[dependencies-url]: https://gemnasium.com/cappuccino/acorn-issue-handler
