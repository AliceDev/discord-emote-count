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
            
            const guild = message.channel.guild;
            if (guild) {
                const user_id = message.author.id;
                const sent_at = message.timestamp;
                const onEntry = this.database.insert.bind(this.database, guild.id, user_id, sent_at);
                const onEmote = this.database.recordEmote.bind(this.database);

                parseMessage(message.content, onEntry, onEmote);
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