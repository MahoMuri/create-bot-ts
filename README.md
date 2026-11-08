# create-bot-ts

Scaffold a modern, **type-driven** Discord.js bot with the folder structure MahoMuri likes.

## What you get

```
src/
├── index.ts          # entry point: signal handlers, then BotClient.init()
├── client/           # BotClient class - extends Client; init() loads + logs in
├── commands/         # slash commands, auto-loaded from this folder
├── config/           # env.ts - loads .env once and validates it
├── events/           # event handlers, auto-loaded from this folder
├── interfaces/       # shared types: Command, BotEvent
├── scripts/          # one-off scripts: deploy-commands.ts registers slash commands
└── utils/            # tagged logger + module loaders
```

- Strict, type-driven TypeScript — `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `NodeNext` module resolution
- Named exports only — every command/event file exports a single `const` named after the file (`ping.ts` → `ping`), so imports autocomplete and nothing depends on a default export
- `BotClient extends Client` with `init()` — calls `loadCommands` + `loadEvents` from `src/utils`, then logs in
- One place reads the environment — `src/config/env.ts` loads `.env` and exposes a typed `env` object plus `requireDiscordToken()`
- Tagged logging — `createLogger('deploy')` prints `[bot:deploy]`, so a single grep finds every line a subsystem wrote
- Graceful shutdown on `SIGINT` / `SIGTERM`, plus `unhandledRejection` / `uncaughtException` handlers
- `yarn deploy` / `yarn deploy:build` — registers guild/application slash commands (one guild or every guild the bot joined) via `src/scripts/deploy-commands.ts`
- discord.js v14 + `bufferutil` / `zlib-sync`, `dotenv`, `consola`, `common-tags`, `table`
- ESLint 9 **flat config** with type-aware linting from `typescript-eslint` (works out of the box, no manual config step)
- Prettier + Husky + lint-staged pre-commit hook
- Yarn 4 using the `node-modules` linker (fewer tooling quirks than PnP)
- `tsx watch` for a modern dev runner (no `ts-node`)

## Usage

Run it inside an **empty directory**:

```sh
# npm
npx create-bot-ts@latest

# yarn
yarn create bot-ts
```

The script refuses to run in a non-empty directory unless you pass `--force`.

```
Node.js >= 24.17 required (discord.js v14 minimum)
```

### Options

| Flag              | Description                      |
| ----------------- | -------------------------------- |
| `-f`, `--force`   | write into a non-empty directory |
| `-h`, `--help`    | show usage                       |
| `-v`, `--version` | print the version                |

## Structure

The CLI is split by responsibility so a new generated file only touches one place:

| Location         | Purpose                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `index.js`       | bin entry — loads `src/main.js` and reports crashes                        |
| `src/main.js`    | the scaffold pipeline (an ordered list of steps)                           |
| `src/cli/`       | `args`, `preflight` (non-empty dir guard), `reporter`                      |
| `src/steps/`     | one module per pipeline step (structure, config, git, deps, husky, readme) |
| `src/templates/` | the generated file contents, grouped by area                               |
| `src/utils/`     | `run` (exec), `projectName`, `writeFiles`                                  |

Templates are plain `outdent` strings — no build step, and Prettier/ESLint leave
template-literal bodies untouched, so the generated files keep their own 2-space
style while this repo keeps its 4-space one.

## Development

```sh
yarn install
yarn lint          # ESLint over the scaffolder
yarn format:check  # Prettier check
yarn check         # lint + format:check
yarn smoke         # print CLI usage
```

To try a change end to end, scaffold into a throwaway directory:

```sh
mkdir -p /tmp/try && cd /tmp/try && node /path/to/create-bot-ts/index.js
```
