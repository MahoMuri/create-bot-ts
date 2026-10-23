# create-bot-ts

Scaffold a modern, **type-driven** Discord.js bot with the folder structure MahoMuri likes.

## What you get

```
src/
├── index.ts        # entry point: creates BotClient, calls init()
├── client/         # BotClient class - extends Client; init() loads + logs in
├── commands/       # slash commands, auto-loaded from this folder
├── events/         # event handlers, auto-loaded from this folder
├── utils/          # shared helpers
├── interfaces/     # shared types: Command, BotEvent
└── models/         # data models
```

- Strict, type-driven TypeScript — `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `NodeNext` module resolution
- `BotClient extends Client` with `init()` — loads every command from `src/commands` and every event from `src/events`, then logs in
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

## Structure

| Location   | Purpose                          |
| ---------- | -------------------------------- |
| `bin`      | `create-bot-ts` → `index.js`     |
| `index.js` | the scaffolder itself            |
