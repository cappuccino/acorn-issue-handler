"use strict";

let del = require("del"),
    gulp = require("gulp"),
    issueHandler = require("./index.js"),
    loadPlugins = require("gulp-load-plugins"),
    path = require("path"),
    runSequence = require("run-sequence");

// jscs: disable requireMultipleVarDecl

let $ = loadPlugins();

// jscs: enable

// Cleaning

gulp.task("clean", () => del("test/fixtures/**/*.{json,txt}"));

// Linting

const sourceFiles = [
    "gulpfile.js",
    "lib/*.js",
    "test/**/*.js",
    "!test/coverage/**/*.js",
    "!test/fixtures/**/*.js"
];

gulp.task("lint:eslint", () =>
    gulp.src(sourceFiles)
        .pipe($.eslint())
        .pipe($.eslint.format("stylish"))
);

gulp.task("lint:jscs", () =>
    gulp.src(sourceFiles)
        .pipe($.jscs())
        .on("error", () => {})
        .pipe($.jscsStylish())
);

gulp.task("lint", cb => runSequence("lint:eslint", "lint:jscs", cb));

// Fixtures

gulp.task("generate-fixtures", function()
{
    const fixturesPath = "test/fixtures";

    function generateFixture(file, encoding, cb)
    {
        let code = require(file.path);

        console.log(file.relative);

        let issues = [],
            name = path.basename(file.path);

        code.run(issues);
        file.contents = new Buffer(issueHandler.getFormattedIssues(issues, name !== "no-color.js"));
        cb(null, file);
    }

    let through = require("through2").obj;

    gulp.src([`${fixturesPath}/**/*.js`, `!${fixturesPath}/**/_*.js`])
        .pipe($.changed(fixturesPath, { extension: ".txt" }))
        .pipe(through(generateFixture))
        .pipe($.rename({ extname: ".txt" }))
        .pipe(gulp.dest(fixturesPath));
});

gulp.task("regenerate-fixtures", cb => runSequence("clean", "generate-fixtures", cb));

// Tests

gulp.task("mocha", () =>
    gulp.src("test/*.js")
        .pipe($.mocha({ reporter: "dot" }))
);

gulp.task("test", cb => runSequence("lint", "mocha", cb));
