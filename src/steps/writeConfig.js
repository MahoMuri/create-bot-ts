"use strict";

const fs = require("node:fs");
const path = require("node:path");

const config = require("../templates/config");
const { buildPackageJson } = require("../templates/project");
const { writeFiles } = require("../utils/writeFiles");

/** Tooling and editor configuration for the generated project. */
const CONFIG_FILES = [
    { path: "tsconfig.json", content: config.TS_CONFIG },
    { path: ".prettierrc.json", content: config.PRETTIER_CONFIG },
    { path: ".prettierignore", content: config.PRETTIER_IGNORE },
    { path: ".gitignore", content: config.GITIGNORE },
    { path: ".env.example", content: config.ENV_EXAMPLE },
    { path: "eslint.config.mjs", content: config.ESLINT_CONFIG },
];

/**
 * Writes the config files plus `package.json`. Dependencies are installed
 * afterwards by `yarn add`, which rewrites this same `package.json` - so this
 * step only owns the parts Yarn does not generate (name, scripts, engines).
 */
const writeConfig = (context) => {
    writeFiles(context.cwd, CONFIG_FILES);

    fs.writeFileSync(
        path.join(context.cwd, "package.json"),
        `${JSON.stringify(buildPackageJson(context.projectName), null, 2)}\n`,
    );
};

module.exports = { CONFIG_FILES, writeConfig };
