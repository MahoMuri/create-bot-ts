"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { run } = require("../utils/run");

/**
 * Adds `scripts.postinstall = "husky"` to the generated `package.json`.
 *
 * This runs after `yarn add -D husky` on purpose: Yarn does not run the
 * `prepare` lifecycle, so husky is wired through `postinstall`
 * (https://typicode.github.io/husky/how-to.html) - but the script has to be
 * absent until the `husky` binary exists, or the first install fails.
 */
const withHuskyPostinstall = (cwd) => {
    const packageJsonPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    pkg.scripts = { ...pkg.scripts, postinstall: "husky" };
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
};

/** Wires the pre-commit hook and materialises `.husky/_` for the project. */
const setupHusky = async (context) => {
    const huskyDir = path.join(context.cwd, ".husky");
    fs.mkdirSync(huskyDir, { recursive: true });
    fs.writeFileSync(path.join(huskyDir, "pre-commit"), "yarn lint-staged\n");

    withHuskyPostinstall(context.cwd);

    await run("yarn postinstall", { cwd: context.cwd });
};

module.exports = { setupHusky, withHuskyPostinstall };
