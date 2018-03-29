const Eris = require("eris");
const _ = require("lodash");
const CommandHandler = require("./CommandHandler.js")
const parseMessage = require("./core/EmoteParser");
const { timestampFromId } = require("./core/Utils");

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
        const onUpdate = this.onMessageUpdate.bind(this);
        this.client.on("messageUpdate", onUpdate);
        const onDelete = this.onMessageDelete.bind(this);
        this.client.on("messageDelete", onDelete);
        this.client.on("messageDeleteBulk", messages => messages.forEach(onDelete));
        this.client.on("guildCreate", guild => this.onGuild(guild.id, guild));
        this.client.on("guildDelete", guild => this.onGuild(null, guild));
        const onEmotesUpdate = this.onGuildEmotesUpdate.bind(this);
        this.client.on("guildEmojisUpdate", onEmotesUpdate);
    }

    onCustomEmote(emote_id, name, is_animated) {
        const guild = this.client.guilds.find(guild => {
            return 0 <= guild.emojis.findIndex(emoji => emoji.id === emote_id);
        });
        const guild_id = guild && guild.id;

        this.database.recordEmote(emote_id, name, is_animated, guild_id);
    }

    onGuild(guild_id, guild) {
        if (!guild.emojis) {
            return;
        }

        const emoji_ids = guild.emojis.map(emoji => emoji.id);

        this.database.updateEmotesGuild(guild_id, emoji_ids);
    }

    onGuildEmotesUpdate(guild, newEmotes, oldEmotes) {
        const removedEmotes = _.differenceBy(oldEmotes, newEmotes, "id");

        this.database.updateEmotesGuild(null, removedEmotes.map(e => e.id));
        // We don't care about added emotes or modified emotes. We'll record them when they're used.
    }

    async onMessageUpdate({ id, channel }) {
        const createdAt = timestampFromId(id);
        const timeSince = Date.now() - createdAt;
        if (timeSince < config.considerationPeriod) {
            const message = await channel.getMessage(id);
            const guild = channel.guild;
            if (guild && message) {
                const user_id = message.author.id;
                const sent_at = message.timestamp;
                const onEntry = this.database.insert.bind(this.database, guild.id, user_id, sent_at);
                const onEmote = this.onCustomEmote.bind(this);
                
                await this.database.delete(guild.id, user_id, sent_at);
                parseMessage(message.content, onEntry, onEmote);
            }
        }
    }

    onMessageDelete(message) {
        const createdAt = timestampFromId(message.id);
        const timeSince = Date.now() - createdAt;
        if (timeSince < config.considerationPeriod) {
            const guild = message.channel.guild;
            if (guild && message.author) {
                const user_id = message.author.id;
                const sent_at = message.timestamp;

                this.database.delete(guild.id, user_id, sent_at);
            }
        }
    }

    connect() {
        this.client.connect();
        this.client.on("ready", () => {
            console.log("Ready!");
        });
    }
}

module.exports = Client;