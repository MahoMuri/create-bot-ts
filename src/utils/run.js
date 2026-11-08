"use strict";

const { exec } = require("node:child_process");

/**
 * Promisified `exec`. Resolves with trimmed stdout and rejects on a non-zero
 * exit code; stderr is appended to the error message so failures stay
 * debuggable without hiding the command that failed.
 */
const run = (command, options = {}) =>
    new Promise((resolve, reject) => {
        exec(
            command,
            {
                cwd: process.cwd(),
                maxBuffer: 50 * 1024 * 1024,
                ...options,
            },
            (error, stdout, stderr) => {
                if (error) {
                    const detail = `${stderr || stdout}`.trim();
                    error.message = detail
                        ? `${error.message}\n${detail}`
                        : error.message;
                    reject(error);
                    return;
                }

                resolve(stdout.trim());
            },
        );
    });

module.exports = { run };
