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

const auth = require("./config/auth.json");
const { bashColors: { none, blue } } = require("./lib/core/Utils");
const logger = require("./lib/core/Logger");
const child_process = require("child_process");
const Client = require("./lib/Client.js");
const Database = require("./lib/core/CassandraDatabase");
const backgroundEnv = Object.assign({}, process.env, { BOT_TOKEN: auth.token });
if (process.env.DEBUGGING === "true") {
    logger.setDefaultLevel("debug");
}
logger.debug("Env:", backgroundEnv);

async function startup() {
    await Database.connect({ dropTables, wipeData, createTables: true });
    const backgroundProcess = child_process.fork("./lib/Background", [], { env: backgroundEnv });
    logger.info("Background process PID:" + blue, backgroundProcess.pid, none);

    const client = new Client(auth.token, Database);
    client.connect();
}

startup();
