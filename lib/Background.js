const Eris = require("eris");
const _ = require("lodash");
const Database = require("./core/CassandraDatabase");
const { parseMessage } = require("./core/EmoteParser");
const { timestampFromId, timestampToId, bashColors: { none, lightGreen } } = require("./core/Utils");
const config = require("../config/config.json");

const logger = console.log;

class Background {
    /**
     * @param {string} token The bot's token
     * @param {Database} database The database client
     */
    constructor(token, database) {
        this.database = database;
        this.client = new Eris(token);
        this.client.on("ready", this.onReady.bind(this));
        this.client.on("messageCreate", this.onMessageCreate.bind(this));
        this.client.on("messageUpdate", this.onMessageUpdate.bind(this));
        this.bucket = new Eris.Bucket(Infinity, 0);
        this.backfilledChannels = new Set();
    }

    onMessageCreate(message) {
        const guild = message.channel.guild;
        if (guild) {
            const user_id = message.author.id;
            const sentAt = message.timestamp;
            const onEntry = this.database.insert.bind(this.database, guild.id, user_id, sentAt);
            const onEmote = this.onCustomEmote.bind(this);

            parseMessage(message.content, onEntry, onEmote);

            // Update the latest_parsed_id if we're done backfilling
            if (this.backfilledChannels.has(message.channel.id)) {
                this.database.recordChannel(message.channel.id, message.id);
            }
        }
    }

    onCustomEmote(emote_id, name, isAnimated) {
        const guild = this.client.guilds.find(guild => {
            return 0 <= guild.emojis.findIndex(emoji => emoji.id === emote_id);
        });
        const guild_id = guild && guild.id;

        this.database.recordEmote(emote_id, name, isAnimated, guild_id);
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

    async parseChannel(channel_id, latestParsed_id, earliestParsed_id, latestUnparsed_id) {
        const channel = this.client.getChannel(channel_id);
        if (!channel) return;
        if (!channel.guild) return;

        let newLatestParsed_id = latestParsed_id;
        let newEarliestParsed_id = earliestParsed_id;
        let newLatestUnparsed_id = latestUnparsed_id;
        let messages;
        if (this.backfilledChannels.has(channel_id)) {
            // The "bottom" (aka oldest) messages of the channel
            messages = await channel.getMessages(100, earliestParsed_id);
            if (messages.length < 1) return; // We done!
            
            messages.forEach(m => this.onMessageCreate(m));
            newEarliestParsed_id = _.minBy(messages, 'id').id;
            await this.database.updateChannel(channel_id, newLatestParsed_id, newEarliestParsed_id)
        } else {
            // The "top" (aka latest) messages of the channel
            messages = await channel.getMessages(100, latestUnparsed_id);
            messages = messages.filter(m => m.id > latestParsed_id);
            if (messages.length > 0) {
                messages.forEach(m => this.onMessageCreate(m));
    
                // Most likely always equal to `messages[message.length - 1]`, but better safe than sorry
                newLatestUnparsed_id = _.minBy(messages, 'id').id;
                await this.database.recordChannel(channel_id, newLatestUnparsed_id);
            }
            if (messages.length < 100) {
                this.backfilledChannels.add(channel_id);

                messages = await channel.getMessages(2);
                newLatestParsed_id = _.maxBy(messages, 'id').id;
                await this.database.updateChannel(channel_id, newLatestParsed_id, newEarliestParsed_id);
                logger("Parsed", channel.name, "from", channel.guild.name);
            }
        }

        this.queueChannel(channel_id, newLatestParsed_id, newEarliestParsed_id, newLatestUnparsed_id);
    }

    queueChannel(channel_id, latestParsed_id, earliestParsed_id, latestUnparsed_id) {
        this.bucket.queue(this.parseChannel.bind(this, channel_id, latestParsed_id, earliestParsed_id, latestUnparsed_id));
    }

    async onReady() {
        const latestMessage_id = timestampToId(Date.now());
        logger(lightGreen + "Background Ready!" + none);

        for (const guild of this.client.guilds.values()) {
            for (const channel of guild.channels.values()) {
                if (channel instanceof Eris.TextChannel &&
                    channel.permissionsOf(this.client.user.id).has("readMessages")) {
                    await this.database.recordChannel(channel.id, latestMessage_id);
                }
            }
        }

        logger("Channels have been recorded! Starting the queue.");

        const channels = await this.database.fetchChannels();
        logger("Fetched", channels.length, "channels");

        channels.forEach(c => {
            const channel_id = c.channel_id && c.channel_id.toString();
            const latestParsed_id = c.latest_parsed_id && c.latest_parsed_id.toString();
            const earliestParsed_id = c.earliest_parsed_id && c.earliest_parsed_id.toString();
            const latestUnparsed_id = c.latest_unparsed_id && c.latest_unparsed_id.toString();
            this.queueChannel(channel_id, latestParsed_id, earliestParsed_id, latestUnparsed_id);
        });
    }

    connect() {
        this.client.connect();
    }
}

Database.connect().then(() => {
    const background = new Background(process.env.BOT_TOKEN, Database);
    background.connect();
});
