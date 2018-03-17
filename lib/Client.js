const Eris = require("eris");
const _ = require("lodash");
const CommandHandler = require("./CommandHandler.js")
const Constants = require("./core/Constants");

const auth = require("../config/auth.json");
const config = require("../config/config.json");

class Client {
    constructor(database) {
        this.database = database;
        this.commandHandler = new CommandHandler(config);
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

function parseMessage(message, onEntry) {
    const guild = message.channel.guild;
    if (guild) {
        const server_id = message.channel.guild.id;
        const user_id = message.author.id;
        const sent_at = message.timestamp;

        const allMatches = [];
        parseContent(message.content, Constants.CUSTOM_REGEX, match => allMatches.push(match[1]));
        parseContent(message.content, Constants.UNICODE_REGEX, match => {
            if (!match[1]) { // If no \
                allMatches.push(match[0])
            }
        });

        Object.entries(_.countBy(allMatches)).forEach(([emote_id, usages]) => {
            onEntry(server_id, user_id, emote_id, sent_at, usages);
        });

        console.log("Counts:", _.countBy(allMatches));
    }
}

function parseContent(message, regex, onMatch) {
    while (match = regex.exec(message)) {
        onMatch(match);
    }
}

module.exports = Client;