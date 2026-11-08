"use strict";

const outdent = require("outdent");

const DEPLOY_UTILS_TS = outdent`
    import { createLogger } from '../utils/logger.js';

    /** Discord snowflakes are the 17-20 digit IDs used for guilds and applications. */
    export const SNOWFLAKE = /^\\d{17,20}$/;

    /** Logger shared by both deploy scripts: renders as \`[bot:deploy]\`. */
    export const deployLogger = createLogger('deploy');

    export interface DeployOptions {
      guildId: string | undefined;
      clientId: string | undefined;
    }

    /**
     * Tiny dependency-free argument parser. Supports \`--flag <value>\`, \`--flag=<value>\`,
     * a bare positional that is treated as the guild ID, and \`--help\` / \`-h\`.
     */
    export function parseArgs(argv: string[]): DeployOptions | 'help' {
      const options: DeployOptions = { guildId: undefined, clientId: undefined };
      let positional: string | undefined;

      for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === undefined) continue;

        if (arg === '--help' || arg === '-h') return 'help';

        if (arg.startsWith('--')) {
          const parts = arg.split('=');
          const flag = parts[0];
          let value = parts[1];

          if (value === undefined) {
            i += 1;
            value = argv[i];
          }
          if (value === undefined) {
            deployLogger.error(\`missing value for "\${flag}" (e.g. \${flag}=123456789012345678)\`);
            return 'help';
          }

          if (flag === '--guild') {
            options.guildId = value;
          } else if (flag === '--client-id') {
            options.clientId = value;
          } else {
            deployLogger.warn(\`ignoring unknown flag "\${arg}"\`);
          }
        } else if (positional === undefined) {
          positional = arg;
        } else {
          deployLogger.warn(\`ignoring unexpected argument "\${arg}"\`);
        }
      }

      if (options.guildId === undefined && positional !== undefined) {
        options.guildId = positional;
      }

      return options;
    }

    /**
     * The application (client) ID can be given explicitly, or is embedded in the
     * token: its first dot-separated segment is the base64-encoded ID.
     */
    export function resolveClientId(
      explicit: string | undefined,
      token: string | undefined,
    ): string | undefined {
      if (explicit !== undefined) return explicit;

      const encoded = token?.split('.')[0];
      if (encoded === undefined || encoded === '') return undefined;

      const decoded = Buffer.from(encoded, 'base64').toString('utf-8').trim();
      return decoded === '' ? undefined : decoded;
    }
`;

const DEPLOY_COMMANDS_TS = outdent`
    import 'dotenv/config';

    import { REST, Routes } from 'discord.js';
    import { getBorderCharacters, table } from 'table';

    import { BotClient } from '../client/index.js';
    import { env, requireDiscordToken } from '../config/env.js';
    import { loadCommands } from '../utils/loadCommands.js';
    import { createLogger } from '../utils/logger.js';

    import { parseArgs, resolveClientId, SNOWFLAKE } from './deploy-utils.js';

    const deployLogger = createLogger('deploy');

    /** Minimal shape of the guilds returned by \`GET /users/@me/guilds\`. */
    interface JoinedGuild {
      id: string;
      name: string;
    }

    /** Minimal shape of an application command returned by the REST API. */
    interface DeployedCommand {
      name: string;
    }

    function printHelp(): void {
      deployLogger.log(\`
    Deploys the bot's slash commands to one or every guild the bot has joined.

    Usage:
      yarn deploy                          deploy to every guild the bot has joined
      yarn deploy <guildId>                deploy to a single guild
      yarn deploy --guild <guildId>        same as above
      yarn deploy --client-id <appId>      override the application (client) ID
      yarn deploy --help                   show this help

    The guild and application IDs can also be set as GUILD_ID / CLIENT_ID in
    .env. When CLIENT_ID is missing, the application ID is parsed from the first
    segment of DISCORD_TOKEN.
    \`);
    }

    /** The given guild, or every guild the bot has joined when none was given. */
    async function resolveGuilds(rest: REST, guildId: string | undefined): Promise<JoinedGuild[]> {
      if (guildId !== undefined) {
        if (!SNOWFLAKE.test(guildId)) {
          deployLogger.warn(\`"\${guildId}" does not look like a Discord snowflake ID.\`);
        }
        return [{ id: guildId, name: guildId }];
      }

      deployLogger.info('no guild specified - deploying to every guild the bot has joined.');
      const guilds = (await rest.get(Routes.userGuilds())) as JoinedGuild[];

      if (guilds.length === 0) {
        deployLogger.error('the bot has not joined any guilds. Invite it to a server first.');
      }

      return guilds;
    }

    async function main(): Promise<void> {
      const parsed = parseArgs(process.argv.slice(2));
      if (parsed === 'help') {
        printHelp();
        return;
      }

      const token = requireDiscordToken();

      const clientId = resolveClientId(parsed.clientId ?? env.clientId, token);
      if (clientId === undefined || !SNOWFLAKE.test(clientId)) {
        deployLogger.error(
          'could not read the application (client) ID. Set CLIENT_ID or pass --client-id <id>.',
        );
        process.exitCode = 1;
        return;
      }

      // Reuse the bot's own loader so we deploy exactly what the running bot loads.
      const client = new BotClient({ intents: [] });
      await loadCommands(client.commandsPath, client.commands);

      const commands = client.commands.map((command) => command.data.toJSON());
      if (commands.length === 0) {
        deployLogger.warn('no commands found in src/commands, nothing to deploy.');
        return;
      }

      const rest = new REST().setToken(token);

      const guilds = await resolveGuilds(rest, parsed.guildId ?? env.guildId);
      if (guilds.length === 0) {
        process.exitCode = 1;
        return;
      }

      deployLogger.info(\`deploying \${commands.length} command(s) to \${guilds.length} guild(s).\`);

      const rows = [['Guild', 'ID', 'Registered']] as string[][];

      for (const guild of guilds) {
        const route = Routes.applicationGuildCommands(clientId, guild.id);

        try {
          const deployed = (await rest.put(route, { body: commands })) as DeployedCommand[];
          rows.push([guild.name || guild.id, guild.id, String(deployed.length)]);
          deployLogger.success(
            \`registered \${deployed.length} command(s) in "\${guild.name}" (\${guild.id})\`,
          );
        } catch (error) {
          rows.push([guild.name || guild.id, guild.id, 'Failed']);
          deployLogger.error(\`failed to deploy commands in "\${guild.name}" (\${guild.id})\`);
          deployLogger.error(error);
          process.exitCode = 1;
        }
      }

      deployLogger.log(
        table(rows, {
          border: getBorderCharacters('norc'),
          header: { alignment: 'center', content: 'Deployed Commands' },
          columns: { 2: { alignment: 'center' } },
        }),
      );
    }

    await main();
`;

module.exports = { DEPLOY_UTILS_TS, DEPLOY_COMMANDS_TS };
