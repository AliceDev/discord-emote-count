const commandLineArgs = {
    DEBUGGING: ["--debug", "-d"],
};

// TODO: Make this generic when there will be too many
process.env.DEBUGGING = process.argv.some(e => commandLineArgs.DEBUGGING.includes(e));

const Client = require("./lib/Client.js");
const Background = require("./lib/Background.js");
const Database = require("./lib/core/CassandraDatabase");

Database.checkTable();
let client = new Client(Database);
client.connect();
