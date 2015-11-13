"use strict";

const
    del = require("del"),
    fs = require("fs"),
    gulp = require("gulp"),
    issueHandler = require("./lib/index.js"),
    loadPlugins = require("gulp-load-plugins"),
    path = require("path"),
    runSequence = require("run-sequence");

const  // jscs: ignore requireMultipleVarDecl
    $ = loadPlugins(),
    paths = {
        lint: [
            "gulpfile.js",
            "lib/*.js",
            "test/**/*.js",
            "!coverage/**/*.js"
        ],
        test: ["test/*.js"],
        fixtures: "test/fixtures",
        cleanFixtures: "test/fixtures/**/*.{json,txt}",
        generateFixtures: ["test/fixtures/*.js", "!test/fixtures/_*.js"],
        coverage: ["lib/**/*.js"]
    };

// Cleaning

gulp.task("clean-fixtures", () => del(paths.cleanFixtures));

// Linting

gulp.task("lint:eslint", () =>
    gulp.src(paths.lint)
        .pipe($.eslint({ rulePaths: ["eslint-rules"] }))
        .pipe($.eslint.format("node_modules/eslint-clang-formatter"))
        .pipe($.eslint.failAfterError())
);

gulp.task("lint:jscs", () =>
    gulp.src(paths.lint)
        .pipe($.jscs())
        .pipe($.jscs.reporter("node_modules/jscs-clang-reporter"))
        .pipe($.jscs.reporter("fail"))
);

gulp.task("lint", cb => runSequence("lint:eslint", "lint:jscs", cb));

// Fixtures

gulp.task("generate-fixtures", () =>
{
    function generateFixture(file, encoding, cb)
    {
        const code = require(file.path);

        console.log(file.relative);

        const
            issues = new issueHandler.IssueList(),
            name = path.basename(file.path);

        let options;

        switch (name)
        {
            case "no-color.js":
                options = false;
                break;

            case "options.js":
                options = JSON.parse(fs.readFileSync("test/fixtures/.clangformatterrc"));
                break;

            default:
                break;
        }

        code.run(issues);
        file.contents = new Buffer(issues.render(options));

        // In case the code changed the color map
        issueHandler.resetColorMap();

        if (name === "clangformatterrc.js")
            fs.unlinkSync("./.clangformatterrc");

        cb(null, file);
    }

    const through = require("through2").obj;

    gulp.src(paths.generateFixtures)
        .pipe($.changed(paths.fixtures, { extension: ".txt" }))
        .pipe(through(generateFixture))
        .pipe($.rename({ extname: ".txt" }))
        .pipe(gulp.dest(paths.fixtures));
});

gulp.task("regenerate-fixtures", cb => runSequence("clean-fixtures", "generate-fixtures", cb));

// Tests

function mochaTask(reporter)
{
    return function()
    {
        return gulp.src(paths.test)
            .pipe($.mocha({ reporter: reporter || "spec" }));
    };
}

gulp.task("$coverage-setup", () =>
    gulp.src(paths.coverage)
        .pipe($.istanbul())
        .pipe($.istanbul.hookRequire())
);

gulp.task("$coverage-mocha", ["$coverage-setup"], mochaTask("dot"));

gulp.task("$coverage-report", ["$coverage-mocha"], () =>
    gulp.src(paths.test)
        .pipe($.istanbul.writeReports({ reporters: ["text", "html"] }))
        .pipe($.istanbul.enforceThresholds({
             thresholds: { global: 100 }
        }))
);

gulp.task("mocha", mochaTask("spec"));
gulp.task("mocha-dot", mochaTask("dot"));
gulp.task("coverage", ["$coverage-report"], cb => cb());
gulp.task("test", cb => runSequence("lint", "coverage", cb));
gulp.task("default", ["test"]);
