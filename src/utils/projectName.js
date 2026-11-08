"use strict";

const path = require("node:path");

/**
 * Derives the package name from the directory the CLI was run in: lowercased,
 * with every run of unsupported characters collapsed into a single `-`.
 */
const projectName = (cwd) =>
    path
        .basename(cwd)
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "discord-bot";

module.exports = { projectName };
