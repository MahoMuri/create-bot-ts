#!/usr/bin/env node
const cp = require("child_process");
const fs = require("fs");
const path = require("path");
const outdent = require("outdent");
const { createSpinner } = require("nanospinner");

// Start the spinner
const spinner = createSpinner(
    "Creating template! Do not exit the process..."
).start({
    color: "green",
});

const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;
const time = process.hrtime();

// Make the src directories
fs.mkdirSync(path.join(process.cwd(), "src"));

// Declare function that writes files
const writeFiles = (files) => {
    files.map((f) => {
        fs.writeFileSync(
            path.join(process.cwd(), f.path),
            outdent`${f.content}`
        );
    });
};

// Use the declared function above here.
writeFiles([
    {
        path: "tsconfig.json",
        content: `{
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
        content: `{
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
        content: `# @see https://git-scm.com/docs/gitignore

# \`.DS_Store\` is a file that stores custom attributes of its containing folder
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

spinner.update({
    text: "Initializing npm package...",
});

// Initialize the npm package with -y to default to yes to all prompts
cp.exec("npm init -y", { cwd: process.cwd() }, () => {
    spinner.update({
        text: "Initializing Yarn Berry...",
        color: "blue",
    });
    // Set yarn version to berry
    cp.exec("yarn set version berry", { cwd: process.cwd() }, () => {
        spinner.update({
            text: "Adding git...",
            color: "red",
        });

        // Synchronize git
        cp.execSync("git init", { cwd: process.cwd() });

        spinner.update({
            text: "Installing yarn plugins...",
            color: "blue",
        });

        // Install yarn plugins
        cp.execSync("yarn plugin import version", { cwd: process.cwd() });
        cp.execSync("yarn plugin import interactive-tools", {
            cwd: process.cwd(),
        });

        cp.exec("yarn", { cwd: process.cwd() }, () => {
            cp.exec(
                "yarn plugin import typescript",
                { cwd: process.cwd() },
                () => {
                    spinner.update({
                        text: "Adding necessary devDependencies",
                        color: "yellow",
                    });
                    cp.exec(
                        `yarn add --dev typescript eslint eslint-config-airbnb-base eslint-config-prettier eslint-import-resolver-node eslint-plugin-import eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser husky lint-staged node-notifier prettier @types/node ts-node ts-node-dev`,
                        { cwd: process.cwd() },
                        () => {
                            spinner.update({
                                text: "Setting up husky...",
                                color: "cyan",
                            });

                            cp.execSync("yarn dlx husky-init --yarn2", {
                                cwd: process.cwd(),
                            });

                            spinner.update({
                                text: "Setting up sdks...",
                                color: "cyan",
                            });

                            cp.execSync("yarn dlx @yarnpkg/sdks vscode", {
                                cwd: process.cwd(),
                            });

                            spinner.update({
                                text: "Adding scripts...",
                                color: "magenta",
                            });
                            const package = JSON.parse(
                                fs.readFileSync(
                                    path.join(process.cwd(), "package.json"),
                                    { encoding: "utf-8" }
                                )
                            );
                            package.scripts = {
                                test: "yarn eslint",
                                prod: "ts-node --transpile-only ./src/index.ts",
                                dev: "ts-node-dev --respawn --transpile-only --notify --rs ./src/index.ts",
                                prettier: "prettier ./src/**/*.ts",
                                "prettier:fix":
                                    "prettier --write ./src/**/*.ts",
                                eslint: "eslint ./src/**/*.ts",
                                "eslint:fix": "eslint --fix ./src/**/*.ts",
                            };
                            package["lint-staged"] = {
                                "./src/**/*.ts": ["eslint --fix"],
                            };

                            fs.writeFileSync(
                                path.join(process.cwd(), "package.json"),
                                JSON.stringify(package, null, 4)
                            );

                            spinner.update({
                                text: "Generating README.md...",
                                color: "magenta",
                            });

                            fs.writeFileSync(
                                path.join(process.cwd(), "README.md"),
                                outdent`
                                        # ${package.name}
                                        
                                        Created with created with [create-bot-ts](https://github.com/MahoMuri/create-bot-ts)
                                        
                                        Based from [create-ts-pro](https://github.com/Milo123456789/create-ts-pro)
                                        
                                        Features:
                                        - Yarn PnP
                                        - Husky
                                        - ESlint and prettier
                                        - TypeScript
                                        - Version Plugin
                                        - Upgrade-interactive plugin

                                        Next Steps, run:
                                        \`\`\`sh
                                        yarn create @eslint/config
                                        \`\`\`

                                        to fully initialize eslint.
                                        `
                            );
                            const diff = process.hrtime(time);
                            const seconds =
                                (diff[0] * NS_PER_SEC + diff[1] * MS_PER_NS) /
                                NS_PER_SEC;
                            spinner.success({
                                text: `Sucessfully Generated ${
                                    package.name
                                } template in ${seconds.toFixed(3)}s`,
                            });
                        }
                    );
                }
            );
        });
    });
});
