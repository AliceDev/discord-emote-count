const Eris = require("eris");
const _ = require("lodash");
const CommandHandler = require("./CommandHandler.js");
const { humanizeTime, timestampFromId, bashColors: { none, lightGreen } } = require("./core/Utils");
const config = require("../config/config.json");

const logger = require("./core/Logger.js");
const ChannelLogger = require("./ChannelLogger.js");


class Client {
    constructor(token, database) {
        this.database = database;
        this.commandHandler = new CommandHandler(config.prefix, this);
        this.client = new Eris(token);
        this.ws = {};

        // TODO: Allow enabling them individually instead of all at once
        this.client.on("error", e => logger.error(e));
        this.client.on("warn", e => logger.warn(e));
        this.client.on("debug", e => logger.debug(e));

        this.client.on("ready", this.onReady.bind(this));
        this.client.on("messageCreate", this.onMessageCreate.bind(this));
        const onDelete = this.onMessageDelete.bind(this);
        this.client.on("messageDelete", onDelete);
        this.client.on("messageDeleteBulk", messages => messages.forEach(onDelete));
        this.client.on("guildCreate", this.onGuildCreate.bind(this));
        this.client.on("guildDelete", this.onGuildDelete.bind(this));
        this.client.on("guildEmojisUpdate", this.onGuildEmotesUpdate.bind(this));
        this.client.on("rawWS", this.onPacket.bind(this));
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
        let logChannel = this.client.getChannel(config.logChannel || "ErisIsQuality");
        if(logChannel) {
            logger.debug("Detected channel to log client messages to.");
            this.channelLogger = new ChannelLogger(logChannel);

            logger.registerListener("info", this.onLogMessage.bind(this));
        }

        logger.info(lightGreen + "Ready!" + none);

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

        this.rotatingStatus();
        setInterval(this.rotatingStatus.bind(this), config.statusInterval);
    }

    onLogMessage(packet) {
        this.channelLogger.logToChannel(packet);
    }

    onPacket(packet) {
        let t = packet.t;
        if(!t) return;
        if(!this.ws[t]) {
            this.ws[t] = 0;
        }
        this.ws[t]++;
    }

    rotatingStatus() {
        const statuses = [
            `for ${humanizeTime(this.client.uptime)}!`,
            `with ${this.client.users.size} users!`,
            `in ${this.client.guilds.size} servers!`,
        ].concat(config.customRotatingStatuses);

        const name = statuses[Math.floor(Math.random() * statuses.length)];
        this.client.editStatus("online", { name });
    }

    connect() {
        this.client.connect();
    }
}

module.exports = Client;