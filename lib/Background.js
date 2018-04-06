const Eris = require("eris");
const _ = require("lodash");
const Database = require("./core/CassandraDatabase");
const { timestampToId, bashColors: { none, lightGreen } } = require("./core/Utils");

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
        this.bucket = new Eris.Bucket(Infinity, 0);
    }

    async parseChannel({ channel_id, latest_parsed_id, earliest_parsed_id, latest_unparsed_id }) {
        // The parameters here are snake_case because they come straight from the database.
        const guild_id = this.client.channelGuildMap[channel_id];
        if (!guild_id) return;
        const guild = this.client.guilds.get(guild_id);
        if (!guild) return;
        const channel = guild.channels.get(channel_id);
        if (!channel) return;
        logger("Parsing channel:", channel, "Latest message:", latest_message_id, "Earliest message:", earliest_message_id);

        // Start from the "bottom" (aka oldest) messages of the channel
        let messages = await channel.getMessages(100, earliest_message_id);
        if (messages.length < 1) {
            // TODO: Parse the messages
        } else { // Then go from the "top" (aka latest) messages of the channel
            messages = await channel.getMessages(100, latest_unparsed_id, earliest_parsed_id);
            if (messages.length < 1) return; // We done!
            
            // TODO: Parse the messages
        }
        // TODO: Requeue this?
    }

    queueChannel(channel) {
        this.bucket.queue(this.parseChannel.bind(this, channel));
    }

    async onReady() {
        const latestMessage_id = timestampToId(Date.now());
        logger(lightGreen + "Background Ready!" + none);

        for (const guild of this.client.guilds.values()) {
            for (const channel of guild.channels.values()) {
                if (channel instanceof Eris.TextChannel) {
                    await this.database.recordChannel(channel.id, latestMessage_id);
                }
            }
        }

        logger("Channels have been recorded! Starting the queue.");

        const channels = await this.database.fetchChannels();

        channels.forEach(c => this.queueChannel(c));
    }

    connect() {
        this.client.connect();
    }
}

const background = new Background(process.env.BOT_TOKEN, Database);
background.connect();
