"use strict";

const outdent = require("outdent");

/** The generated project's README, titled after the project. */
const buildReadme = (projectName) =>
    outdent`
    # ${projectName}

    A Discord bot scaffolded with [create-bot-ts](https://github.com/MahoMuri/create-bot-ts).

    ## Features

    - strict, type-driven TypeScript (\`verbatimModuleSyntax\`, \`exactOptionalPropertyTypes\`, \`noUncheckedIndexedAccess\`)
    - discord.js v14 with typed events
    - ESLint 9 flat config with type-aware linting (typescript-eslint)
    - Prettier for consistent formatting
    - Husky + lint-staged pre-commit hook
    - Yarn 4 with the node-modules linker
    - tagged logging (\`[bot:commands]\`, \`[bot:deploy]\`) built on \`consola\`
    - graceful shutdown on \`SIGINT\` / \`SIGTERM\`
    - \`yarn deploy\` script that registers your slash commands with Discord

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
    - \`yarn deploy\` — register slash commands with Discord (\`tsx\`)
    - \`yarn deploy:build\` — register slash commands from \`dist/\`
    - \`yarn typecheck\` — run \`tsc --noEmit\`
    - \`yarn lint\` / \`yarn lint:fix\` — lint with ESLint
    - \`yarn format\` / \`yarn format:check\` — format with Prettier

    ## Project structure

    \`\`\`
    src/
    ├── index.ts          # entry point: signal handlers, then BotClient.init()
    ├── client/           # BotClient class - extends Client; init() loads + logs in
    ├── commands/         # slash commands, auto-loaded from this folder
    ├── config/           # env.ts - loads .env once and validates it
    ├── events/           # event handlers, auto-loaded from this folder
    ├── interfaces/       # shared types: Command, BotEvent
    ├── scripts/          # one-off scripts: deploy-commands.ts registers slash commands
    └── utils/            # tagged logger + module loaders
    \`\`\`

    ## How it works

    - Every file in \`src/commands\` exports one named \`Command\` (\`ping.ts\` -> \`ping\`).
      \`loadCommands\` (\`src/utils/loadCommands.ts\`) imports them into \`client.commands\`,
      keyed by \`data.name\`.
    - Every file in \`src/events\` exports one named \`BotEvent\` (\`ready.ts\` -> \`ready\`).
      \`loadEvents\` (\`src/utils/loadEvents.ts\`) registers them, honouring \`once\`.
    - \`client.init(token)\` runs both loaders, then calls \`client.login(token)\`.
    - \`src/config/env.ts\` is the only module that reads \`process.env\`. Import \`env\`
      from it instead of touching \`process.env\` directly, so a missing variable fails
      in one predictable place.
    - \`createLogger('name')\` (\`src/utils/logger.ts\`) returns a logger that tags every
      line \`[bot:name]\`, so one grep finds everything a subsystem said.

    Each command is a \`data\` (\`SlashCommandBuilder\`) + \`execute\` pair.

    ## Deploying commands

    Slash commands only appear in Discord once their \`data\` JSON is registered with
    the REST API, which is what \`src/scripts/deploy-commands.ts\` does. It reuses the
    bot's own loader, so you deploy exactly the commands the bot loads at runtime.

    \`\`\`sh
    yarn deploy                     # every guild the bot has joined
    yarn deploy <guildId>           # a single guild (instant, good for development)
    yarn deploy --guild <guildId>   # same as above
    yarn deploy --client-id <appId> # override the application (client) ID
    yarn deploy --help              # full help
    \`\`\`

    Guild commands are available immediately. Set \`GUILD_ID\` / \`CLIENT_ID\` in
    \`.env\` to make those IDs the default. After \`yarn build\`, use
    \`yarn deploy:build\` to run the compiled script from \`dist/\`.
`;

module.exports = { buildReadme };
