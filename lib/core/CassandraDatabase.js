const { Client } = require("cassandra-driver");
// TODO: Make the contactPoints configurable and the keyspace automatically generated
const client = new Client({ contactPoints: ["localhost"], keyspace: "emotes"});
const queries = require("./Queries");
const _ = require("lodash");
const logger = console.log;

class Cassandra {
    constructor(client) {
        this.client = client;
    }

    async checkTable() {
        await this.executeQueries(queries.createTables);
        logger("Tables created.");
        await this.executeQueries(queries.createIndexes);
        logger("Indexes created.");
    }

    async wipeData() {
        await this.executeQueries(queries.wipeData);
        logger("Data wiped.");
    }

    async executeQueries(queryList) {
        for (const query of queryList) {
            await this.client.execute(query, [], { prepare: true });
        }
    }

    async recordChannel(channel_id, latestUnparsed_id) {
        await this.client.execute(queries.insertChannel, [ channel_id, latestUnparsed_id ], { prepare: true });
    }

    async updateChannel(channel_id, latestMessage_id, earliestMessage_id) {
        await this.client.execute(queries.updateChannel, [ channel_id, latestMessage_id, earliestMessage_id ], { prepare: true });
    }

    async fetchChannels() {
        const { rows } = await this.client.execute(queries.fetchChannels, [], { prepare: true });
        
        return rows;
    }

    async recordGuilds(guild_ids) {
        for (const guild_id of guild_ids) {
            await this.client.execute(queries.insertGuild, [ guild_id ], { prepare: true });
        }
    }

    async fetchGuilds() {
        const { rows } = await this.client.execute(queries.fetchGuilds, [], { prepare: true });

        return rows.map(g => g.id);
    }

    async removeGuilds(guild_ids) {
        if (guild_ids.length > 0) {
            await this.client.execute(queries.removeGuilds, [ guild_ids ], { prepare: true });
        }
    }

    async recordEmote(emote_id, name, isAnimated, guild_id) {
        await this.client.execute(queries.insertEmoteMetadata, [ emote_id, name, isAnimated, guild_id ], { prepare: true });
    }

    async unsetEmoteGuild(emote_id) {
        await this.client.execute(queries.unsetEmoteGuildMetadata, [ emote_id ], { prepare: true });
    }

    async updateEmotesGuild(guild_id, emote_ids) {
        if (emote_ids.length < 1) {
            return;
        }
        
        await this.client.execute(queries.updateEmotesGuild, [ guild_id, emote_ids ], { prepare: true });
    }

    async insert(guild_id, user_id, sentAt, emote_id, usages) {
        await this.client.execute(queries.insertEmote, [ guild_id, user_id, emote_id, sentAt, usages ], { prepare: true });
    }

    async delete(guild_id, user_id, sentAt) {
        const { rows } = await this.client.execute(queries.fetchEntriesSentAt, [ guild_id, user_id, sentAt ], { prepare: true });

        if (rows.length < 1) {
            return;
        }
        await this.client.execute(queries.deleteEmotes, [ rows.map(row => row.id) ], { prepare: true });
    }

    async fetch(filters, groupBy) {
        const { query, params } = queries.parseFilters(filters);
        const groupColumn = queries.parseGroupBy(groupBy);

        const { rows } = await this.client.execute(query, params, { prepare: true });

        return groupSumResultsBy(rows, groupColumn, queries.emoteUsagesColumn);
    }

    async getEmoteMetadata(emote_ids) {
        if (emote_ids.length < 1) {
            return;
        }
        
        const { rows } = await this.client.execute(queries.fetchEmoteMetadata, [ emote_ids ], { prepare: true });

        return groupResultsBy(rows, queries.customEmoteIdColumn);
    }

    async connect() {
        await this.client.connect();

        logger("--------------------------------------------");
        logger("Connected to Cassandra hosts:");
        client.hosts.forEach(function (host) {
            logger(host.address, host.datacenter, host.rack);
         });
         logger("--------------------------------------------");

        await this.checkTable();
    }
}

/**
 * Groups objects from an array into a single object by using the given columns to derive the key/value of the final object
 * 
 * @param {{}[]} objects An array of objects to group
 * @param {string} keyColumn The column to use for the new Object's keys
 * @returns {{}} The grouped object
 */
function groupResultsBy(objects, keyColumn) {
    return objects.reduce((acc, current) => {
        const key = current[keyColumn];
        const value = _.omit(current, keyColumn);
        acc[key] = value;
        return acc;
    }, {});
}

/**
 * Groups objects from an array into an object by doing a sum of sumBy for all objects with the same groupBy value
 * 
 * @param {{}[]} objects An array of objects to group
 * @param {string} groupBy The column to use for grouping
 * @param {string} sumBy The column to use for summing
 * @returns {{}} The grouped object
 */
function groupSumResultsBy(objects, groupBy, sumBy) {
    return objects.reduce((acc, current) => {
        const key = current[groupBy];
        acc[key] = acc[key] || 0;
        acc[key] += current[sumBy] || 0;
        return acc;
    }, {});
}

module.exports = new Cassandra(client);
