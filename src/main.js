"use strict";

const { USAGE, parseArgs, version } = require("./cli/args");
const { assertEmptyDirectory } = require("./cli/preflight");
const { StepError, createReporter } = require("./cli/reporter");
const {
    configureYarn,
    initRepository,
    useStableYarn,
} = require("./steps/initGit");
const {
    installDevDependencies,
    installRuntimeDependencies,
} = require("./steps/installDependencies");
const { scaffoldSource } = require("./steps/scaffoldSource");
const { setupHusky } = require("./steps/setupHusky");
const { writeConfig } = require("./steps/writeConfig");
const { writeReadme } = require("./steps/writeReadme");
const { projectName } = require("./utils/projectName");

/** The ordered scaffold pipeline: label, spinner colour, work. */
const STEPS = [
    ["Scaffolding project structure", "green", scaffoldSource],
    ["Writing configuration files", "cyan", writeConfig],
    ["Initializing git repository", "red", initRepository],
    ["Enabling Yarn 4 (stable)", "blue", useStableYarn],
    ["Configuring Yarn (node-modules linker)", "blue", configureYarn],
    ["Adding runtime dependencies", "blue", installRuntimeDependencies],
    ["Adding development dependencies", "yellow", installDevDependencies],
    ["Setting up husky + lint-staged", "cyan", setupHusky],
    ["Generating README.md", "magenta", writeReadme],
];

/** Prints the underlying error of a failed step, without the step wrapper. */
const reportFailure = (error) => {
    const cause = error instanceof StepError ? error.cause : error;
    console.error(
        `\n${cause instanceof Error ? cause.message : String(cause)}`,
    );
    process.exitCode = 1;
};

/**
 * Scaffolds a bot into `process.cwd()`.
 *
 * Every failure path sets `process.exitCode` instead of calling
 * `process.exit()`, so buffered spinner output is still flushed.
 */
const main = async (argv = process.argv.slice(2)) => {
    const args = parseArgs(argv);

    if (args.help) {
        console.log(USAGE);
        return;
    }

    if (args.version) {
        console.log(version);
        return;
    }

    const cwd = process.cwd();

    try {
        assertEmptyDirectory({ cwd, force: args.force });
    } catch (error) {
        console.error(`[create-bot-ts] ${error.message}`);
        process.exitCode = 1;
        return;
    }

    const name = projectName(cwd);
    const context = { cwd, projectName: name };
    const reporter = createReporter();
    const startedAt = process.hrtime.bigint();

    try {
        for (const [label, color, step] of STEPS) {
            await reporter.step(label, color, () => step(context));
        }
    } catch (error) {
        reportFailure(error);
        return;
    }

    const seconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    reporter.success(
        `Successfully generated ${name} template in ${seconds.toFixed(3)}s`,
    );
};

module.exports = { STEPS, main };
