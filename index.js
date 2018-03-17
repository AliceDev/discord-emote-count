const Client = require("./lib/Client.js");
const Background = require("./lib/Background.js");
const Database = require("./lib/core/CassandraDatabase");

Database.checkTable();
let client = new Client(Database);
client.connect();
