"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { buildReadme } = require("../templates/readme");

/** Writes the generated project's README, titled after the project. */
const writeReadme = (context) => {
    fs.writeFileSync(
        path.join(context.cwd, "README.md"),
        `${buildReadme(context.projectName).trimEnd()}\n`,
    );
};

module.exports = { writeReadme };
