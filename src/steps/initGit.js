"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { run } = require("../utils/run");

/** `.yarnrc.yml` addition that keeps installs in `node_modules` (not PnP). */
const NODE_LINKER = [
    "# Install dependencies into node_modules for",
    "# maximum tooling compatibility.",
    "nodeLinker: node-modules",
    "",
].join("\n");

/** Creates the git repository on `main`. */
const initRepository = (context) =>
    run("git init -b main", { cwd: context.cwd });

/** Pins the project to Yarn 4 (Berry) by writing `.yarnrc.yml` + a release. */
const useStableYarn = (context) =>
    run("yarn set version stable", { cwd: context.cwd });

/**
 * Keeps whatever `yarn set version` wrote (e.g. `yarnPath`) and appends the
 * linker setting, which Yarn 4 otherwise leaves at its PnP default.
 */
const configureYarn = (context) => {
    const yarnrcPath = path.join(context.cwd, ".yarnrc.yml");
    const existing = fs.existsSync(yarnrcPath)
        ? fs.readFileSync(yarnrcPath, "utf8")
        : "";

    if (existing.includes("nodeLinker")) return;

    fs.writeFileSync(
        yarnrcPath,
        existing.trimEnd() === ""
            ? NODE_LINKER
            : `${existing.trimEnd()}\n\n${NODE_LINKER}`,
    );
};

module.exports = { configureYarn, initRepository, useStableYarn };
