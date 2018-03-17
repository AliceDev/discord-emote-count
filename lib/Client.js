const Eris = require("eris");
const CommandHandler = require("./CommandHandler.js")
const parseMessage = require("./core/EmoteParser");

const auth = require("../config/auth.json");
const config = require("../config/config.json");

class Client {
    constructor(database) {
        this.database = database;
        this.commandHandler = new CommandHandler(config, this);
        this.client = new Eris(auth.token);
        this.client.on("messageCreate", (message) => {
            if(message.content.startsWith(config.prefix)) {
                this.commandHandler.parse(message);
            }
            parseMessage(message, (server_id, user_id, emote_id, sent_at, usages) =>
                    this.database.insert(server_id, user_id, emote_id, sent_at, usages));
        });
    }

    connect() {
        this.client.connect();
        this.client.on("ready", () => {
            console.log("Ready!");
        });
    }
}

module.exports = Client;