const Eris = require("eris");
const _ = require("lodash");
const Database = require("./core/CassandraDatabase");
const { bashColors: { none, lightGreen } } = require("./core/Utils");

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

    async parseChannel({ channel_id, latest_message_id, earliest_message_id }) {
        logger("Parsing channel:", channel_id, "Latest message:", latest_message_id, "Earliest message:", earliest_message_id);
    }

    queueChannel(channel) {
        this.bucket.queue(this.parseChannel.bind(this, channel));
    }

    async onReady() {
        logger(lightGreen + "Background Ready!" + none);

        for (const guild of this.client.guilds.values()) {
            for (const channel of guild.channels.values()) {
                await this.database.recordChannel(channel.id);
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
