"use strict";

const { run } = require("../utils/run");

/** Runtime dependencies of the generated bot, in install order. */
const RUNTIME_DEPENDENCIES = [
    "discord.js",
    "bufferutil",
    "zlib-sync",
    "consola",
    "common-tags",
    "table",
    "dotenv",
];

/**
 * Tooling for the generated bot. `typescript@^6` is quoted because `^` is a
 * shell metacharacter on some platforms.
 */
const DEV_DEPENDENCIES = [
    "'typescript@^6'",
    "tsx",
    "@types/node",
    "eslint",
    "@eslint/js",
    "typescript-eslint",
    "eslint-config-prettier",
    "prettier",
    "globals",
    "husky",
    "lint-staged",
];

/** Installs what the bot needs at runtime. */
const installRuntimeDependencies = (context) =>
    run(`yarn add ${RUNTIME_DEPENDENCIES.join(" ")}`, { cwd: context.cwd });

/** Installs the build/lint/format toolchain. */
const installDevDependencies = (context) =>
    run(`yarn add -D ${DEV_DEPENDENCIES.join(" ")}`, { cwd: context.cwd });

module.exports = {
    DEV_DEPENDENCIES,
    RUNTIME_DEPENDENCIES,
    installDevDependencies,
    installRuntimeDependencies,
};
