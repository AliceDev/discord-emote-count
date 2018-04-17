const Eris = require("eris");
const _ = require("lodash");
const CommandHandler = require("./CommandHandler.js");
const logger = require("./core/Logger.js");
const { timestampFromId, bashColors: { none, lightGreen } } = require("./core/Utils");
const config = require("../config/config.json");


class Client {
    constructor(token, database) {
        this.database = database;
        this.commandHandler = new CommandHandler(config.prefix, this);
        this.client = new Eris(token);

        // TODO: Allow enabling them individually instead of all at once
        this.client.on("error", (e) => logger.error(e));
        this.client.on("warn", (e) => logger.warn(e));
        this.client.on("debug", (e) => logger.debug(e));
        if (process.env.DEBUGGING === "true") {
            logger.setDefaultLevel("debug");
        }

        this.client.on("ready", this.onReady.bind(this));
        this.client.on("messageCreate", this.onMessageCreate.bind(this));
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
        if(config.logChannel) {
            logger.registerListener("info", onLogMessage);
        }

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
        logger.info("Removed guilds:", removedGuild_ids);
        logger.info("Added guilds:", addedGuild_ids);
    }

    onLogMessage(packet) {
        const logColors = {
            info: 0x00FFFF,
            warn: 0xFFFF00,
            error: 0xFFA500,
            critical: 0xFF0000
        };

        // TODO: Queue frequent log messages and send in one embed
        let embed = {
            color: logColors[packet.label] ? logColors[packet.label] : 0xFFFFFF,
            title: packet.label ? `[${packet.label.toUpperCase()}]` : `[Level: ${packet.level}]`,
            description: packet.message
        };

        this.client.createMessage(config.logChannel, { embed }).catch(() => {});
    }

    connect() {
        this.client.connect();
    }
}

module.exports = Client;