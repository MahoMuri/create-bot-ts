#!/usr/bin/env node
const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const outdent = require("outdent");
const { createSpinner } = require("nanospinner");

// Make the src directories
fs.mkdirSync(path.join(process.cwd(), "src"));

const writeFiles = (files) => {
    files.map((f) => {
        fs.writeFileSync(
            path.join(process.cwd(), f.path),
            outdent`${f.content}`
        );
    });
};

writeFiles([
    {
        path: "tsconfig.json",
        content: `
{
    "compilerOptions": {
        "lib": ["ESNext"],
        "module": "commonjs",
        "moduleResolution": "node",
        "target": "ESNext",
        "sourceMap": true,
        "esModuleInterop": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "allowSyntheticDefaultImports": true,
        "skipLibCheck": true,
        "skipDefaultLibCheck": true,
        "declaration": true,
        "resolveJsonModule": true
    },
    "include": ["src"]
}
        `,
    },
    {
        path: ".prettierrc",
        content: `
{
    "semi": true,
    "singleQuote": false,
    "tabWidth": 4,
    "printWidth": 80,
    "useTabs": false,
    "endOfLine": "lf"
}

        `,
    },
    {
        path: ".gitignore",
        content: `
# @see https://git-scm.com/docs/gitignore

# \``
            .DS_Store`\` is a file that stores custom attributes of its containing folder
.DS_Store

# Logs
logs
*.log

# Dependencies
node_modules
bower_components
vendor

# yarn v2
.yarn/*
!.yarn/cache
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# Envs
.env

# Databases
*.db

# Caches
.cache
.npm
.eslintcache

# Temporaries
.tmp
.temp

# Built
dist
target
built
output
out

# Editor directories and files
.idea
.templates
template.config.js
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Push Scripts
push.bat
push.sh

        `,
    },
]);

const spinner = createSpinner(
    "Creating template! Do not exit the process..."
).start({
    color: "green",
});

cp.exec("npm init -y", { cwd: process.cwd() }, () => {
    cp.exec("yarn set version berry", { cwd: process.cwd() }, () => {
        spinner.update({
            text: "Initializing Yarn Berry configurations...",
        });
        cp.execSync("git init", { cwd: process.cwd() });
        cp.execSync("yarn plugin import version", { cwd: process.cwd() });
        cp.execSync("yarn plugin import interactove-tools", {
            cwd: process.cwd(),
            color: "blue",
        });
        cp.exec("yarn", { cwd: process.cwd() }, () => {
            cp.exec(
                "yarn plugin import typescript",
                { cwd: process.cwd() },
                () => {
                    spinner.update({
                        text: "Adding necessary devDependencies",
                    });
                    cp.exec(
                        `yarn add --dev eslint eslint-config-airbnb-base eslint-config-prettier eslint-import-resolver-node eslint-plugin-import eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser husky lint-staged node-notifier prettier ts-node ts-node-dev`,
                        { cwd: process.cwd() },
                        () => {}
                    );
                }
            );
        });
    });
});
