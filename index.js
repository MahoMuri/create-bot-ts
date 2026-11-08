#!/usr/bin/env node
const { exec } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createSpinner } = require("nanospinner");
const outdent = require("outdent");

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/**
 * Promisified exec. Resolves with trimmed stdout and rejects on non-zero exit.
 * stderr is appended to the error message so failures stay debuggable.
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

/** Write a batch of templated files, each ending with a single newline. */
const writeFiles = (files) => {
    for (const file of files) {
        const content = outdent`${file.content}`.trimEnd() + os.EOL;
        fs.writeFileSync(path.join(process.cwd(), file.path), content);
    }
};

// ---------------------------------------------------------------------------
// Preflight — refuse to scaffold into a non-empty directory unless forced
// ---------------------------------------------------------------------------

const FORCE = process.argv.includes("--force");

const existingEntries = fs
    .readdirSync(process.cwd())
    .filter((entry) => entry !== ".git");

if (existingEntries.length > 0 && !FORCE) {
    const list = existingEntries
        .slice(0, 4)
        .map((entry) => `"${entry}"`)
        .join(", ");
    const more =
        existingEntries.length > 4
            ? `, and ${existingEntries.length - 4} more`
            : "";
    console.error(
        `[create-bot-ts] refusing to scaffold into a non-empty directory (${list}${more}).\n` +
            "Run this inside an empty directory, or pass --force to overwrite.",
    );
    process.exit(1);
}

const projectName =
    path
        .basename(process.cwd())
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "") || "discord-bot";

// ---------------------------------------------------------------------------
// Generated file templates (kept formatting-clean for prettier --check)
// ---------------------------------------------------------------------------

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

const CLIENT_TS = outdent`
    import { dirname, join } from 'node:path';
    import { fileURLToPath } from 'node:url';

    import { Client, Collection } from 'discord.js';

    import type { ClientOptions } from 'discord.js';

    import { loadCommands } from '../utils/loadCommands.js';
    import { loadEvents } from '../utils/loadEvents.js';

    import type { Command } from '../interfaces/command.js';

    export class BotClient extends Client {
      /** Commands loaded from src/commands, keyed by command name. */
      public readonly commands: Collection<string, Command> = new Collection();

      private readonly commandsPath: string;
      private readonly eventsPath: string;

      public constructor(options: ClientOptions) {
        super(options);

        // Anchor to this file so paths resolve from src/ (tsx) and dist/ (build).
        const directory = dirname(fileURLToPath(import.meta.url));
        this.commandsPath = join(directory, '..', 'commands');
        this.eventsPath = join(directory, '..', 'events');
      }

      /** Loads every command + event, then logs the bot in. */
      public async init(token: string): Promise<void> {
        await Promise.all([
          loadCommands(this.commandsPath, this.commands),
          loadEvents(this, this.eventsPath),
        ]);

        await super.login(token);
      }
    }
`;

const COMMAND_INTERFACE_TS = outdent`
    import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

    export interface Command {
      data: SlashCommandBuilder;
      execute(interaction: ChatInputCommandInteraction): Promise<void>;
    }
`;

const EVENT_INTERFACE_TS = outdent`
    import type { ClientEvents } from 'discord.js';

    export interface BotEvent<T extends keyof ClientEvents> {
      name: T;
      once?: boolean;
      execute(...args: ClientEvents[T]): void | Promise<void>;
    }
`;

const MODULES_TS = outdent`
    import { readdir } from 'node:fs/promises';
    import { join, parse } from 'node:path';
    import { pathToFileURL } from 'node:url';

    /** Dev runs \`.ts\` sources, a build runs \`.js\`. Accept both. */
    export const isModuleFile = (file: string): boolean => file.endsWith('.ts') || file.endsWith('.js');

    /** \`ping.ts\` -> \`ping\`: the named export every module is expected to provide. */
    export const moduleName = (file: string): string => parse(file).name;

    /**
     * Lists the loadable files in \`folder\`, sorted so the load order stays stable
     * instead of depending on the order the filesystem hands entries back.
     */
    export const listModules = async (folder: string): Promise<string[]> =>
      (await readdir(folder)).filter(isModuleFile).sort();

    /** Imports a module namespace. A file URL keeps this working on every platform. */
    export const importModule = async (
      folder: string,
      file: string,
    ): Promise<Record<string, unknown>> => {
      const target = pathToFileURL(join(folder, file)).href;
      return (await import(target)) as Record<string, unknown>;
    };

    /**
     * Picks the value a module exports under \`name\`, falling back to the first export
     * that \`isModule\` accepts. The convention is that \`ping.ts\` exports \`ping\`, but a
     * mismatch still loads instead of silently registering nothing.
     */
    export const resolveExport = <T>(
      loaded: Record<string, unknown>,
      name: string,
      isModule: (value: unknown) => value is T,
    ): T | undefined => {
      const named = loaded[name];
      if (isModule(named)) return named;
      return Object.values(loaded).find(isModule);
    };
`;

const LOAD_COMMANDS_TS = outdent`
    import { consola } from 'consola';

    import type { Collection } from 'discord.js';

    import type { Command } from '../interfaces/command.js';

    import { importModule, listModules, moduleName, resolveExport } from './modules.js';

    /** A module is a command when it exposes both \`data\` and \`execute\`. */
    const isCommand = (value: unknown): value is Command =>
      typeof value === 'object' && value !== null && 'data' in value && 'execute' in value;

    /**
     * Imports every command in \`folder\` into \`commands\`, keyed by \`data.name\`.
     * A broken file is logged and skipped so one bad command never stops the bot.
     */
    export const loadCommands = async (
      folder: string,
      commands: Collection<string, Command>,
    ): Promise<Collection<string, Command>> => {
      for (const file of await listModules(folder)) {
        const name = moduleName(file);

        try {
          const loaded = await importModule(folder, file);
          const command = resolveExport(loaded, name, isCommand);

          if (command === undefined) {
            consola.warn(\`[commands] skipping "\${file}": no "\${name}" command export\`);
            continue;
          }

          commands.set(command.data.name, command);
        } catch (error) {
          consola.error(\`[commands] failed to load "\${file}"\`);
          consola.error(error);
        }
      }

      consola.info(\`[commands] loaded \${commands.size} command(s)\`);

      return commands;
    };
`;

const LOAD_EVENTS_TS = outdent`
    import { consola } from 'consola';

    import type { Client, ClientEvents } from 'discord.js';

    import type { BotEvent } from '../interfaces/event.js';

    import { importModule, listModules, moduleName, resolveExport } from './modules.js';

    /** A module is an event when it exposes both \`name\` and \`execute\`. */
    const isBotEvent = (value: unknown): value is BotEvent<keyof ClientEvents> =>
      typeof value === 'object' && value !== null && 'name' in value && 'execute' in value;

    /**
     * Registers every event in \`folder\` on \`client\`, honouring \`once\`.
     * A broken file is logged and skipped so one bad handler never stops the bot.
     */
    export const loadEvents = async (client: Client, folder: string): Promise<number> => {
      let registered = 0;

      for (const file of await listModules(folder)) {
        const name = moduleName(file);

        try {
          const loaded = await importModule(folder, file);
          const botEvent = resolveExport(loaded, name, isBotEvent);

          if (botEvent === undefined) {
            consola.warn(\`[events] skipping "\${file}": no "\${name}" event export\`);
            continue;
          }

          if (botEvent.once) {
            client.once(botEvent.name, (...args: ClientEvents[typeof botEvent.name]) => {
              void botEvent.execute(...args);
            });
          } else {
            client.on(botEvent.name, (...args: ClientEvents[typeof botEvent.name]) => {
              void botEvent.execute(...args);
            });
          }

          registered += 1;
        } catch (error) {
          consola.error(\`[events] failed to load "\${file}"\`);
          consola.error(error);
        }
      }

      consola.info(\`[events] registered \${registered} event(s)\`);

      return registered;
    };
`;

const PING_COMMAND_TS = outdent`
    import { SlashCommandBuilder } from 'discord.js';

    import type { Command } from '../interfaces/command.js';

    export const ping: Command = {
      data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
      async execute(interaction) {
        await interaction.reply({ content: 'Pong!' });
      },
    };
`;

const READY_EVENT_TS = outdent`
    import { consola } from 'consola';
    import { Events } from 'discord.js';

    import type { BotEvent } from '../interfaces/event.js';

    export const ready: BotEvent<Events.ClientReady> = {
      name: Events.ClientReady,
      once: true,
      execute(client) {
        consola.success(\`Logged in as \${client.user.username}\`);
      },
    };
`;

const INTERACTION_CREATE_TS = outdent`
    import { consola } from 'consola';
    import { Events } from 'discord.js';

    import type { BotClient } from '../client/index.js';
    import type { BotEvent } from '../interfaces/event.js';

    export const interactionCreate: BotEvent<Events.InteractionCreate> = {
      name: Events.InteractionCreate,
      async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const client = interaction.client as BotClient;
        const command = client.commands.get(interaction.commandName);

        if (command === undefined) {
          await interaction.reply({ content: 'Command not found.', ephemeral: true });
          return;
        }

        try {
          await command.execute(interaction);
        } catch (error) {
          consola.error(\`[commands] "\${interaction.commandName}" threw an error\`);
          consola.error(error);

          const message = 'There was an error while executing this command.';
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: message, ephemeral: true });
          } else {
            await interaction.reply({ content: message, ephemeral: true });
          }
        }
      },
    };
`;

const INDEX_TS = outdent`
    import 'dotenv/config';

    import { consola } from 'consola';
    import { GatewayIntentBits } from 'discord.js';

    import { BotClient } from './client/index.js';

    const token = process.env.DISCORD_TOKEN;

    if (token === undefined) {
      consola.error('DISCORD_TOKEN is missing. Copy .env.example to .env and set your bot token.');
      process.exit(1);
    }

    const client = new BotClient({
      intents: [GatewayIntentBits.Guilds],
    });

    await client.init(token);
`;

const README = outdent`
    # ${projectName}

    A Discord bot scaffolded with [create-bot-ts](https://github.com/MahoMuri/create-bot-ts).

    ## Features

    - strict, type-driven TypeScript (\`verbatimModuleSyntax\`, \`exactOptionalPropertyTypes\`, \`noUncheckedIndexedAccess\`)
    - discord.js v14 with typed events
    - ESLint 9 flat config with type-aware linting (typescript-eslint)
    - Prettier for consistent formatting
    - Husky + lint-staged pre-commit hook
    - Yarn 4 with the node-modules linker
    - \`dotenv\`, \`consola\`, \`common-tags\`, \`table\` utilities

    ## Getting started

    \`\`\`sh
    cp .env.example .env
    \`\`\`

    Open \`.env\` and set \`DISCORD_TOKEN\` to your bot token, then run:

    \`\`\`sh
    yarn dev
    \`\`\`

    ## Scripts

    - \`yarn dev\` — start the bot with hot-reload (\`tsx watch\`)
    - \`yarn build\` — type-check and compile to \`dist/\`
    - \`yarn start\` — run the compiled bot
    - \`yarn typecheck\` — run \`tsc --noEmit\`
    - \`yarn lint\` / \`yarn lint:fix\` — lint with ESLint
    - \`yarn format\` / \`yarn format:check\` — format with Prettier

    ## Project structure

    \`\`\`
    src/
    ├── index.ts        # entry point: creates BotClient, calls init()
    ├── client/         # BotClient class - extends Client; init() loads + logs in
    ├── commands/       # slash commands, auto-loaded from this folder
    ├── events/         # event handlers, auto-loaded from this folder
    ├── interfaces/     # shared types: Command, BotEvent
    └── utils/          # module loaders: loadCommands(), loadEvents(), resolveExport()
    \`\`\`

    ## How it works

    - Every file in \`src/commands\` exports one named \`Command\` (\`ping.ts\` -> \`ping\`).
      \`loadCommands\` (\`src/utils/loadCommands.ts\`) imports them into \`client.commands\`,
      keyed by \`data.name\`.
    - Every file in \`src/events\` exports one named \`BotEvent\` (\`ready.ts\` -> \`ready\`).
      \`loadEvents\` (\`src/utils/loadEvents.ts\`) registers them, honouring \`once\`.
    - \`client.init(token)\` runs both loaders, then calls \`client.login(token)\`.

    Each command is a \`data\` (\`SlashCommandBuilder\`) + \`execute\` pair. To make slash
    commands show up in your server, register each command's \`data\` JSON with the
    Discord REST API (see the discord.js command deployment guide).
`;

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

const main = async () => {
    const spinner = createSpinner(
        "Creating template! Do not exit the process...",
    ).start({ color: "green" });

    const startedAt = process.hrtime.bigint();

    const step = async (label, color, fn) => {
        spinner.update({ text: label, color });
        try {
            await fn();
        } catch (error) {
            spinner.error({
                text: `Failed to ${label.toLowerCase()}`,
                color: "red",
            });
            const message =
                error instanceof Error ? error.message : String(error);
            console.error(`\n${message}`);
            process.exit(1);
        }
    };

    // 1. Folder structure (kept from the original template on purpose)
    await step("Scaffolding project structure", "green", () => {
        for (const dir of [
            "src",
            "src/client",
            "src/commands",
            "src/events",
            "src/utils",
            "src/interfaces",
        ]) {
            fs.mkdirSync(path.join(process.cwd(), dir), { recursive: true });
        }

        writeFiles([
            { path: "src/index.ts", content: INDEX_TS },
            { path: "src/client/index.ts", content: CLIENT_TS },
            { path: "src/commands/ping.ts", content: PING_COMMAND_TS },
            { path: "src/events/ready.ts", content: READY_EVENT_TS },
            {
                path: "src/events/interactionCreate.ts",
                content: INTERACTION_CREATE_TS,
            },
            { path: "src/interfaces/command.ts", content: COMMAND_INTERFACE_TS },
            { path: "src/interfaces/event.ts", content: EVENT_INTERFACE_TS },
            { path: "src/utils/modules.ts", content: MODULES_TS },
            { path: "src/utils/loadCommands.ts", content: LOAD_COMMANDS_TS },
            { path: "src/utils/loadEvents.ts", content: LOAD_EVENTS_TS },
        ]);
    });

    // 2. Config files + package.json
    await step("Writing configuration files", "cyan", () => {
        writeFiles([
            { path: "tsconfig.json", content: TS_CONFIG },
            { path: ".prettierrc.json", content: PRETTIER_CONFIG },
            { path: ".prettierignore", content: PRETTIER_IGNORE },
            { path: ".gitignore", content: GITIGNORE },
            { path: ".env.example", content: ENV_EXAMPLE },
            { path: "eslint.config.mjs", content: ESLINT_CONFIG },
        ]);

        fs.writeFileSync(
            path.join(process.cwd(), "package.json"),
            `${JSON.stringify(
                {
                    name: projectName,
                    version: "0.1.0",
                    private: true,
                    description: "A Discord bot scaffolded with create-bot-ts",
                    type: "module",
                    engines: { node: ">=24.17.0" },
                    scripts: {
                        dev: "tsx watch src/index.ts",
                        build: "tsc",
                        start: "node dist/index.js",
                        typecheck: "tsc --noEmit",
                        lint: "eslint .",
                        "lint:fix": "eslint . --fix",
                        format: "prettier --write .",
                        "format:check": "prettier --check .",
                    },
                    "lint-staged": {
                        "*.ts": ["eslint --fix", "prettier --write"],
                    },
                },
                null,
                2,
            )}\n`,
        );
    });

    // 3. Git + Yarn 4
    await step("Initializing git repository", "red", () =>
        run("git init -b main"),
    );
    await step("Enabling Yarn 4 (stable)", "blue", () =>
        run("yarn set version stable"),
    );

    // Keep whatever `yarn set version` wrote (e.g. yarnPath), then add the linker.
    await step("Configuring Yarn (node-modules linker)", "blue", () => {
        const yarnrcPath = path.join(process.cwd(), ".yarnrc.yml");
        const existing = fs.existsSync(yarnrcPath)
            ? fs.readFileSync(yarnrcPath, "utf8")
            : "";
        if (!existing.includes("nodeLinker")) {
            const linker =
                "# Install dependencies into node_modules for\n" +
                "# maximum tooling compatibility.\n" +
                "nodeLinker: node-modules\n";
            fs.writeFileSync(
                yarnrcPath,
                existing.trimEnd() === ""
                    ? linker
                    : `${existing.trimEnd()}\n\n${linker}`,
            );
        }
    });

    // 4. Dependencies
    await step("Adding runtime dependencies", "blue", () =>
        run(
            "yarn add discord.js bufferutil zlib-sync consola common-tags table dotenv",
        ),
    );

    await step("Adding development dependencies", "yellow", () =>
        run(
            "yarn add -D 'typescript@^6' tsx @types/node eslint @eslint/js typescript-eslint eslint-config-prettier prettier globals husky lint-staged",
        ),
    );

    // 5. Husky. Yarn does not run the `prepare` lifecycle, so husky is wired
    // through `postinstall` instead (https://typicode.github.io/husky/how-to.html).
    await step("Setting up husky + lint-staged", "cyan", async () => {
        fs.mkdirSync(path.join(process.cwd(), ".husky"), { recursive: true });
        fs.writeFileSync(
            path.join(process.cwd(), ".husky", "pre-commit"),
            "yarn lint-staged\n",
        );

        const pkgPath = path.join(process.cwd(), "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        pkg.scripts.postinstall = "husky";
        fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

        await run("yarn postinstall");
    });

    // 6. README
    await step("Generating README.md", "magenta", () => {
        fs.writeFileSync(
            path.join(process.cwd(), "README.md"),
            `${README.trimEnd()}\n`,
        );
    });

    const seconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    spinner.success({
        text: `Successfully generated ${projectName} template in ${seconds.toFixed(3)}s`,
    });
};

if (require.main === module) {
    main();
}