const commandLineArgs = {
    DEBUGGING: ["--debug", "-d"],
    COLORS: ["--colors", "-c"],
    WIPE_DATA: ["--wipe-data"],
    DROP_TABLES: ["--drop-tables"],
    NO_BACKFILLING: ["--no-backfill"],
};

// TODO: Make this generic when there will be too many
process.env.DEBUGGING = process.argv.some(e => commandLineArgs.DEBUGGING.includes(e));
process.env.COLORS = process.argv.some(e => commandLineArgs.COLORS.includes(e));
process.env.NO_BACKFILLING = process.argv.some(e => commandLineArgs.NO_BACKFILLING.includes(e));
const wipeData = process.argv.some(e => commandLineArgs.WIPE_DATA.includes(e));
const dropTables = process.argv.some(e => commandLineArgs.DROP_TABLES.includes(e));

const { bashColors: { none, blue } } = require("./lib/core/Utils");
const logger = require("./lib/core/Logger");
const child_process = require("child_process");
const Client = require("./lib/Client.js");
const Database = require("./lib/core/db/PostgreSQL");
if (process.env.DEBUGGING === "true") {
    logger.setDefaultLevel("debug");
}
logger.debug("Env:", process.env);

async function startup(bot_token) {
    await Database.connect({ dropTables, wipeData, createTables: true });
    const backgroundProcess = child_process.fork("./lib/Background");
    logger.info("Background process PID:" + blue, backgroundProcess.pid, none);

    const client = new Client(bot_token, Database);
    client.connect();
}

if (process.env.EMOTE_BOT_TOKEN) {
    startup(process.env.EMOTE_BOT_TOKEN);
} else {
    console.error("Your bot token is not defined.");
}
