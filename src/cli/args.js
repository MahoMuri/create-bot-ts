"use strict";

const { version } = require("../../package.json");

const USAGE = `
create-bot-ts v${version}

Scaffolds a Discord bot into the current directory. Refuses to run when the
directory already contains files unless --force is passed.

Usage
  npx create-bot-ts [options]

Options
  -f, --force     write into a non-empty directory
  -h, --help      show this help
  -v, --version   print the version
`;

/**
 * Parses the CLI flags. Unknown arguments are ignored on purpose: package
 * managers inject stray arguments (`--`) when forwarding through `npx`.
 */
const parseArgs = (argv) => {
    const flags = new Set(argv);

    return {
        force: flags.has("--force") || flags.has("-f"),
        help: flags.has("--help") || flags.has("-h"),
        version: flags.has("--version") || flags.has("-v"),
    };
};

module.exports = { USAGE, parseArgs, version };
