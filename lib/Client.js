const Eris = require("eris");
const _ = require("lodash");
const CommandHandler = require("./CommandHandler.js")
const { parseMessage } = require("./core/EmoteParser");
const { timestampFromId, bashColors: { none, lightGreen } } = require("./core/Utils");

const config = require("../config/config.json");
const logger = console.log;

class Client {
    constructor(token, database) {
        this.database = database;
        this.commandHandler = new CommandHandler(config.prefix, this);
        this.client = new Eris(token);
        // TODO: Allow enabling them individually instead of all at once
        if (process.env.DEBUGGING === "true") {
            this.client.on("error", logger);
            this.client.on("warn", logger);
            this.client.on("debug", logger);
        }
        this.client.on("messageCreate", this.onMessageCreate.bind(this));
        this.client.on("messageUpdate", this.onMessageUpdate.bind(this));
        const onDelete = this.onMessageDelete.bind(this);
        this.client.on("messageDelete", onDelete);
        this.client.on("messageDeleteBulk", messages => messages.forEach(onDelete));
        this.client.on("guildCreate", this.onGuildCreate.bind(this));
        this.client.on("guildDelete", this.onGuildDelete.bind(this));
        this.client.on("guildEmojisUpdate", this.onGuildEmotesUpdate.bind(this));
    }

    onMessageCreate(message) {
        if(message.content.startsWith(config.prefix)) {
            this.commandHandler.parse(message);
        }
        
        const guild = message.channel.guild;
        if (guild) {
            const user_id = message.author.id;
            const sentAt = message.timestamp;
            const onEntry = this.database.insert.bind(this.database, guild.id, user_id, sentAt);
            const onEmote = this.onCustomEmote.bind(this);

            parseMessage(message.content, onEntry, onEmote);
        }
    }

    onCustomEmote(emote_id, name, isAnimated) {
        const guild = this.client.guilds.find(guild => {
            return 0 <= guild.emojis.findIndex(emoji => emoji.id === emote_id);
        });
        const guild_id = guild && guild.id;

        this.database.recordEmote(emote_id, name, isAnimated, guild_id);
    }
    
    onGuildCreate(guild) {
        this.onGuild(guild.id, guild);
        this.database.recordGuilds([ guild.id ]);
    }

    onGuildDelete(guild) {
        this.onGuild(null, guild);
        this.database.removeGuilds([ guild.id ]);
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
                const sentAt = message.timestamp;
                const onEntry = this.database.insert.bind(this.database, guild.id, user_id, sentAt);
                const onEmote = this.onCustomEmote.bind(this);
                
                await this.database.delete(guild.id, user_id, sentAt);
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
                const sentAt = message.timestamp;

                this.database.delete(guild.id, user_id, sentAt);
            }
        }
    }

    async onReady() {
        logger(lightGreen + "Ready!" + none);

        const rawGuild_ids = await this.database.fetchGuilds();
        const guild_ids = rawGuild_ids.map(g_id => g_id.toString());
        const currentGuild_ids = [...this.client.guilds.keys()];

        const removedGuild_ids = _.difference(guild_ids, currentGuild_ids); // previous - current = removed
        const addedGuild_ids = _.difference(currentGuild_ids, guild_ids); // current - previous = added

        await this.database.removeGuilds(removedGuild_ids);
        await this.database.recordGuilds(addedGuild_ids);

        for (const guild_id of addedGuild_ids) {
            const guild = this.client.guilds.get(guild_id);
            this.onGuild(guild_id, guild);
        }
        logger("Removed guilds:", removedGuild_ids);
        logger("Added guilds:", addedGuild_ids);
    }

    connect() {
        this.client.connect();
        this.client.on("ready", this.onReady.bind(this));
    }
}

module.exports = Client;