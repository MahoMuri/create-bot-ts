"use strict";

const outdent = require("outdent");

const TS_CONFIG = outdent`
    {
      "compilerOptions": {
        "lib": ["ESNext"],
        "target": "ESNext",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "moduleDetection": "force",
        "rootDir": "src",
        "outDir": "dist",
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitOverride": true,
        "noFallthroughCasesInSwitch": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "verbatimModuleSyntax": true,
        "resolveJsonModule": true,
        "esModuleInterop": true,
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true,
        "sourceMap": true,
        "noEmitOnError": true
      },
      "include": ["src"]
    }
`;
const PRETTIER_CONFIG = outdent`
    {
      "semi": true,
      "singleQuote": true,
      "tabWidth": 2,
      "printWidth": 100,
      "trailingComma": "all",
      "endOfLine": "lf"
    }
`;
const PRETTIER_IGNORE = outdent`
    dist
    node_modules
    .yarn
    .husky
    package.json
    yarn.lock
`;
const GITIGNORE = outdent`
    # Dependencies
    node_modules

    # Yarn (node-modules linker keeps some metadata in .yarn)
    .yarn/*
    !.yarn/plugins
    !.yarn/releases
    !.yarn/sdks
    !.yarn/patches
    !.yarn/versions

    # Build output
    dist

    # Environment
    .env
    .env.*
    !.env.example

    # Logs
    logs
    *.log

    # Husky runtime
    .husky/_

    # Editor directories and files
    .idea
    .vscode/*
    !.vscode/extensions.json
    .DS_Store
`;
const ENV_EXAMPLE = outdent`
    # Bot token from the Discord Developer Portal
    # https://discord.com/developers/applications
    DISCORD_TOKEN=

    # Optional defaults for \`yarn deploy\`. When these are empty the guild ID
    # comes from the CLI argument and the client ID is parsed from DISCORD_TOKEN.
    # GUILD_ID=
    # CLIENT_ID=
`;
const ESLINT_CONFIG = outdent`
    // @ts-check
    import eslint from '@eslint/js';
    import prettierConfig from 'eslint-config-prettier/flat';
    import globals from 'globals';
    import tseslint from 'typescript-eslint';

    export default tseslint.config(
      {
        ignores: ['dist', 'node_modules', '.yarn', '.husky', 'eslint.config.mjs'],
      },
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      {
        languageOptions: {
          globals: globals.node,
          parserOptions: {
            projectService: true,
          },
        },
        rules: {
          // Type-driven codebase: type-only imports must use \`import type\`.
          '@typescript-eslint/consistent-type-imports': 'error',
          // discord.js is promise based; never drop a floating promise.
          '@typescript-eslint/no-floating-promises': 'error',
          // Async event handlers are idiomatic in discord.js — keep the rule
          // for promise misuse, but allow promise-returning listeners (\`checksVoidReturn\`).
          '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
          // Event listeners often take unused args - allow the \`_\` prefix.
          '@typescript-eslint/no-unused-vars': [
            'error',
            {
              argsIgnorePattern: '^_',
              caughtErrorsIgnorePattern: '^_',
              varsIgnorePattern: '^_',
            },
          ],
        },
      },
      prettierConfig,
    );
`;

module.exports = {
    TS_CONFIG,
    PRETTIER_CONFIG,
    PRETTIER_IGNORE,
    GITIGNORE,
    ENV_EXAMPLE,
    ESLINT_CONFIG,
};
