const Eris = require("eris");
const CommandHandler = require("./CommandHandler.js")
const parseMessage = require("./core/EmoteParser");

const auth = require("../config/auth.json");
const config = require("../config/config.json");
const logger = console.log;

class Client {
    constructor(database) {
        this.database = database;
        this.commandHandler = new CommandHandler(config, this);
        this.client = new Eris(auth.token);
        // this.client.on('error', logger);
        // this.client.on('warn', logger);
        // this.client.on('debug', logger); 
        this.client.on("messageCreate", (message) => {
            if(message.content.startsWith(config.prefix)) {
                this.commandHandler.parse(message);
            }
            
            const guild = message.channel.guild;
            if (guild) {
                const user_id = message.author.id;
                const sent_at = message.timestamp;
                const onEntry = this.database.insert.bind(this.database, guild.id, user_id, sent_at);
                const onEmote = this.onCustomEmote.bind(this);

                parseMessage(message.content, onEntry, onEmote);
            }
        });
    }

    onCustomEmote(emote_id, name, is_animated) {
        const guild = this.client.guilds.find(guild => {
            return 0 <= guild.emojis.findIndex(emoji => emoji.id === emote_id);
        });
        const guild_id = guild && guild.id;

        this.database.recordEmote(emote_id, name, is_animated, guild_id);
    }

    connect() {
        this.client.connect();
        this.client.on("ready", () => {
            console.log("Ready!");
        });
    }
}

module.exports = Client;