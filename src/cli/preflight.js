"use strict";

const fs = require("node:fs");

/** Entries that would be overwritten. `.git` is expected and therefore fine. */
const blockingEntries = (cwd) =>
    fs.readdirSync(cwd).filter((entry) => entry !== ".git");

/**
 * Guards against clobbering an existing project: a stray `npx create-bot-ts`
 * inside a repository must fail loudly instead of rewriting files.
 *
 * @throws {Error} when the directory holds files and `force` is not set.
 */
const assertEmptyDirectory = ({ cwd, force }) => {
    const entries = blockingEntries(cwd);
    if (force || entries.length === 0) return;

    const list = entries
        .slice(0, 4)
        .map((entry) => `"${entry}"`)
        .join(", ");
    const more = entries.length > 4 ? `, and ${entries.length - 4} more` : "";

    throw new Error(
        `refusing to scaffold into a non-empty directory (${list}${more}).\n` +
            "Run this inside an empty directory, or pass --force to overwrite.",
    );
};

module.exports = { assertEmptyDirectory, blockingEntries };
