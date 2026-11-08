"use strict";

const outdent = require("outdent");

const INDEX_TS = outdent`
    import { GatewayIntentBits } from 'discord.js';

    import { BotClient } from './client/index.js';
    import { requireDiscordToken } from './config/env.js';
    import { logger } from './utils/logger.js';

    const client = new BotClient({
      intents: [GatewayIntentBits.Guilds],
    });

    /** Closes the gateway connection so a restart never leaves it behind. */
    const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
      logger.info(\`Received \${signal}, shutting down.\`);
      await client.destroy();
    };

    // Ctrl+C in a terminal and the stop signal of a process manager/container.
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    // A rejected promise nobody awaited must not silently kill the bot.
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection:');
      logger.error(reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:');
      logger.error(error);
      process.exitCode = 1;
    });

    await client.init(requireDiscordToken());
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

      public readonly commandsPath: string;
      public readonly eventsPath: string;

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

const ENV_TS = outdent`
    import 'dotenv/config';

    import { logger } from '../utils/logger.js';

    /** Reads an environment variable, treating a blank value as unset. */
    const read = (key: string): string | undefined => {
      const value = process.env[key]?.trim();
      return value === undefined || value === '' ? undefined : value;
    };

    /**
     * Every environment variable the bot understands, resolved once at startup.
     *
     * Importing this module is what loads \`.env\`, so nothing else needs
     * \`dotenv/config\` and every consumer sees the same parsed values.
     */
    export const env = {
      discordToken: read('DISCORD_TOKEN'),
      guildId: read('GUILD_ID'),
      clientId: read('CLIENT_ID'),
    };

    /**
     * Returns the bot token, or exits with an actionable message when it is
     * missing. Startup and the deploy script share this check so the error text
     * never drifts.
     */
    export const requireDiscordToken = (): string => {
      if (env.discordToken === undefined) {
        logger.error('DISCORD_TOKEN is missing. Copy .env.example to .env and set your bot token.');
        process.exit(1);
      }

      return env.discordToken;
    };
`;

const LOGGER_TS = outdent`
    import { consola } from 'consola';

    import type { ConsolaInstance } from 'consola';

    /** Root logger for bot-level messages: renders as \`[bot]\`. */
    export const logger = consola.withTag('bot');

    /**
     * Creates a scoped logger: \`createLogger('deploy')\` renders every line it
     * prints as \`[bot:deploy]\`. Keeping one tag chain for the whole process means
     * \`grep '\\[bot:commands\\]'\` works no matter which module logged the line.
     */
    export const createLogger = (tag: string): ConsolaInstance => logger.withTag(tag);
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

    /**
     * Imports \`folder/file\` and resolves it to the expected export shape.
     *
     * Loaders share this so a new kind of module (command, event, button, ...) only
     * has to describe its guard, not the import/resolve boilerplate. Returns
     * \`undefined\` when the file exports nothing usable.
     */
    export const loadModuleExport = async <T>(
      folder: string,
      file: string,
      isModule: (value: unknown) => value is T,
    ): Promise<T | undefined> => {
      const loaded = await importModule(folder, file);
      return resolveExport(loaded, moduleName(file), isModule);
    };
`;

const LOAD_COMMANDS_TS = outdent`
    import type { Collection } from 'discord.js';

    import type { Command } from '../interfaces/command.js';

    import { createLogger } from './logger.js';
    import { loadModuleExport, listModules, moduleName } from './modules.js';

    const logger = createLogger('commands');

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
          const command = await loadModuleExport(folder, file, isCommand);

          if (command === undefined) {
            logger.warn(\`skipping "\${file}": no "\${name}" command export\`);
            continue;
          }

          commands.set(command.data.name, command);
        } catch (error) {
          logger.error(\`failed to load "\${file}"\`);
          logger.error(error);
        }
      }

      logger.info(\`Loaded \${commands.size} command(s)\`);

      return commands;
    };
`;

const LOAD_EVENTS_TS = outdent`
    import type { Client, ClientEvents } from 'discord.js';

    import type { BotEvent } from '../interfaces/event.js';

    import { createLogger } from './logger.js';
    import { loadModuleExport, listModules, moduleName } from './modules.js';

    const logger = createLogger('events');

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
          const botEvent = await loadModuleExport(folder, file, isBotEvent);

          if (botEvent === undefined) {
            logger.warn(\`skipping "\${file}": no "\${name}" event export\`);
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
          logger.error(\`failed to load "\${file}"\`);
          logger.error(error);
        }
      }

      logger.info(\`Registered \${registered} event(s)\`);

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
    import { createLogger } from '../utils/logger.js';

    import { Events } from 'discord.js';

    import type { BotEvent } from '../interfaces/event.js';

    const logger = createLogger('ready');

    export const ready: BotEvent<Events.ClientReady> = {
      name: Events.ClientReady,
      once: true,
      execute(client) {
        logger.success(\`Logged in as \${client.user.username}\`);
      },
    };
`;

const INTERACTION_CREATE_TS = outdent`
    import { Events, MessageFlags } from 'discord.js';

    import type { InteractionReplyOptions } from 'discord.js';

    import type { BotClient } from '../client/index.js';
    import type { BotEvent } from '../interfaces/event.js';
    import { createLogger } from '../utils/logger.js';

    const logger = createLogger('commands');

    export const interactionCreate: BotEvent<Events.InteractionCreate> = {
      name: Events.InteractionCreate,
      async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const client = interaction.client as BotClient;
        const command = client.commands.get(interaction.commandName);

        if (command === undefined) {
          await interaction.reply({
            content: 'Command not found.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        try {
          await command.execute(interaction);
        } catch (error) {
          logger.error(\`"\${interaction.commandName}" threw an error\`);
          logger.error(error);

          const content = 'There was an error while executing this command.';
          const reply: InteractionReplyOptions = { content, flags: MessageFlags.Ephemeral };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      },
    };
`;

module.exports = {
    INDEX_TS,
    CLIENT_TS,
    COMMAND_INTERFACE_TS,
    EVENT_INTERFACE_TS,
    ENV_TS,
    LOGGER_TS,
    MODULES_TS,
    LOAD_COMMANDS_TS,
    LOAD_EVENTS_TS,
    PING_COMMAND_TS,
    READY_EVENT_TS,
    INTERACTION_CREATE_TS,
};
