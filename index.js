const commandLineArgs = {
    DEBUGGING: ["--debug", "-d"],
    COLORS: ["--colors"],
};

// TODO: Make this generic when there will be too many
process.env.DEBUGGING = process.argv.some(e => commandLineArgs.DEBUGGING.includes(e));
process.env.COLORS = process.argv.some(e => commandLineArgs.COLORS.includes(e));

const Client = require("./lib/Client.js");
const child_process = require("child_process");
const Database = require("./lib/core/CassandraDatabase");
const auth = require("./config/auth.json");
const { bashColors: { none, blue } } = require("./lib/core/Utils");

Database.connect();
const client = new Client(auth.token, Database);
client.connect();

const backgroundEnv = Object.assign({}, process.env, { BOT_TOKEN: auth.token });
const backgroundProcess = child_process.fork("./lib/Background", [], { env: backgroundEnv });
console.log("Background process PID:" + blue, backgroundProcess.pid, none);
