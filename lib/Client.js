const Eris = require("eris");
const CommandHandler = require("./CommandHandler.js")

const auth = require("../config/auth.json");
const config = require("../config/config.json");

class Client {
    constructor() {
        this.commandHandler = new CommandHandler(config);
        this.client = new Eris(auth.token);
        this.client.on("messageCreate", (message) => {
            if(message.content.startsWith(config.prefix)) {
                this.commandHandler.parse(message);
            }
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