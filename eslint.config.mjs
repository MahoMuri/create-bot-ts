// @ts-check
import eslint from "@eslint/js";
import prettierConfig from "eslint-config-prettier/flat";
import globals from "globals";

export default [
    {
        ignores: ["node_modules"],
    },
    eslint.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: globals.node,
        },
        rules: {
            // Generated files are strings; unused args are common in callbacks.
            "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
        },
    },
    prettierConfig,
];
