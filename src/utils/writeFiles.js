"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/**
 * Writes generated files relative to `cwd`, creating any missing parent
 * directory on the way. Each file ends in exactly one newline so the result is
 * clean for `git diff`, `prettier --check` and lint-staged.
 */
const writeFiles = (cwd, files) => {
    for (const { path: relative, content } of files) {
        const target = path.join(cwd, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, `${content.trimEnd()}${os.EOL}`);
    }
};

module.exports = { writeFiles };
