"use strict";

const scripts = require("../templates/scripts");
const source = require("../templates/source");
const { writeFiles } = require("../utils/writeFiles");

/**
 * Every TypeScript file the bot itself ships with. Parent directories are
 * created by {@link writeFiles}, so adding a folder here is the only step
 * needed to scaffold it.
 */
const SOURCE_FILES = [
    { path: "src/index.ts", content: source.INDEX_TS },
    { path: "src/client/index.ts", content: source.CLIENT_TS },
    { path: "src/commands/ping.ts", content: source.PING_COMMAND_TS },
    { path: "src/events/ready.ts", content: source.READY_EVENT_TS },
    {
        path: "src/events/interactionCreate.ts",
        content: source.INTERACTION_CREATE_TS,
    },
    {
        path: "src/interfaces/command.ts",
        content: source.COMMAND_INTERFACE_TS,
    },
    { path: "src/interfaces/event.ts", content: source.EVENT_INTERFACE_TS },
    { path: "src/config/env.ts", content: source.ENV_TS },
    { path: "src/utils/logger.ts", content: source.LOGGER_TS },
    { path: "src/utils/modules.ts", content: source.MODULES_TS },
    { path: "src/utils/loadCommands.ts", content: source.LOAD_COMMANDS_TS },
    { path: "src/utils/loadEvents.ts", content: source.LOAD_EVENTS_TS },
    { path: "src/scripts/deploy-utils.ts", content: scripts.DEPLOY_UTILS_TS },
    {
        path: "src/scripts/deploy-commands.ts",
        content: scripts.DEPLOY_COMMANDS_TS,
    },
];

/** Writes the bot's source tree. */
const scaffoldSource = (context) => writeFiles(context.cwd, SOURCE_FILES);

module.exports = { SOURCE_FILES, scaffoldSource };
