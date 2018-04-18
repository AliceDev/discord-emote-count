const { Client } = require("cassandra-driver");
// TODO: Make the contactPoints configurable and the keyspace automatically generated
const client = new Client({ contactPoints: ["localhost"], keyspace: "emotes"});
const queries = require("./Queries");
const _ = require("lodash");
const logger = console.log;

class Cassandra {
    constructor(client) {
        this.client = client;
        this.latestLatencies = [];
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

    async dropTables() {
        await this.executeQueries(queries.dropTables);
        logger("Tables dropped.");
    }

    async execute(query, params) {
        const startTime = Date.now();
        const result = await this.client.execute(query, params, { prepare: true });
        this.latestLatencies.unshift(Date.now() - startTime);
        this.latestLatencies.length = 5;
        return result;
    }

    async executeQueries(queryList) {
        for (const query of queryList) {
            await this.execute(query, []);
        }
    }

    async updateChannel(channel_id, values) {
        const { query, params } = queries.buildUpdateChannel(channel_id, values);

        await this.execute(query, params);
    }

    async fetchChannels() {
        const { rows } = await this.execute(queries.fetchChannels, []);
        
        return rows;
    }

    async recordGuilds(guild_ids) {
        for (const guild_id of guild_ids) {
            await this.execute(queries.insertGuild, [ guild_id ]);
        }
    }

    async fetchGuilds() {
        const { rows } = await this.execute(queries.fetchGuilds, []);

        return rows.map(g => g.id);
    }

    async removeGuilds(guild_ids) {
        if (guild_ids.length > 0) {
            await this.execute(queries.removeGuilds, [ guild_ids ]);
        }
    }

    async recordEmote(emote_id, name, isAnimated, guild_id) {
        await this.execute(queries.insertEmoteMetadata, [ emote_id, name, isAnimated, guild_id ]);
    }

    async unsetEmoteGuild(emote_id) {
        await this.execute(queries.unsetEmoteGuildMetadata, [ emote_id ]);
    }

    async updateEmotesGuild(guild_id, emote_ids) {
        if (emote_ids.length < 1) {
            return;
        }
        
        await this.execute(queries.updateEmotesGuild, [ guild_id, emote_ids ]);
    }

    async insert(guild_id, user_id, sentAt, emote_id, usages) {
        await this.execute(queries.insertEmote, [ guild_id, user_id, emote_id, sentAt, usages ]);
    }

    async delete(guild_id, user_id, sentAt) {
        await this.execute(queries.deleteEmotes, [ guild_id, user_id, sentAt ]);
    }

    async fetch(filters, groupBy) {
        const { query, params } = queries.parseFilters(filters);
        const groupColumn = queries.parseGroupBy(groupBy);

        const { rows } = await this.execute(query, params);

        return groupSumResultsBy(rows, groupColumn, queries.emoteUsagesColumn);
    }

    async getEmoteMetadata(emote_ids) {
        if (emote_ids.length < 1) {
            return;
        }
        
        const { rows } = await this.execute(queries.fetchEmoteMetadata, [ emote_ids ]);

        return groupResultsBy(rows, queries.customEmoteIdColumn);
    }

    async connect({ dropTables, wipeData, createTables }) {
        await this.client.connect();

        logger("--------------------------------------------");
        logger("Connected to Cassandra hosts:");
        client.hosts.forEach(function (host) {
            logger(host.address, host.datacenter, host.rack);
        });
        logger("--------------------------------------------");

        if (dropTables) {
            await this.dropTables();
        } else if (wipeData) {
            await this.wipeData();
        }
        if (createTables) {
            await this.checkTable();
        }
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
