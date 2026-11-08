"use strict";

/** Node version the generated project requires (discord.js v14 minimum). */
const NODE_ENGINE = ">=24.17.0";

/**
 * The generated project's `package.json`.
 *
 * Dependencies and `scripts.postinstall` are added later, by `yarn add` and the
 * husky step - `postinstall` must not exist before `husky` is installed, or the
 * very first `yarn add` fails with "husky: command not found".
 */
const buildPackageJson = (projectName) => ({
    name: projectName,
    version: "0.1.0",
    private: true,
    description: "A Discord bot scaffolded with create-bot-ts",
    type: "module",
    engines: { node: NODE_ENGINE },
    scripts: {
        dev: "tsx watch src/index.ts",
        build: "tsc",
        start: "node dist/index.js",
        deploy: "tsx src/scripts/deploy-commands.ts",
        "deploy:build": "node dist/scripts/deploy-commands.js",
        typecheck: "tsc --noEmit",
        lint: "eslint .",
        "lint:fix": "eslint . --fix",
        format: "prettier --write .",
        "format:check": "prettier --check .",
    },
    "lint-staged": {
        "*.ts": ["eslint --fix", "prettier --write"],
    },
});

module.exports = { NODE_ENGINE, buildPackageJson };
