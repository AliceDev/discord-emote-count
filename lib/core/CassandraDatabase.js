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

    async wipeEmotes() {
        await this.executeQueries(queries.wipeData);
    }

    async executeQueries(queries) {
        for (const query of queries) {
            await this.client.execute(query, [], { prepare: true });
        }
    }

    async recordEmote(emote_id, name, is_animated, guild_id) {
        await this.client.execute(queries.insertEmoteMetadata, [ emote_id, name, is_animated, guild_id ], { prepare: true });
    }

    async insert(guild_id, user_id, sent_at, emote_id, usages) {
        await this.client.execute(queries.insertEmote, [ guild_id, user_id, emote_id, sent_at, usages ], { prepare: true });
    }

    async fetch(filters, groupBy) {
        const { query, params } = queries.parseFilters(filters);
        const groupColumn = queries.parseGroupBy(groupBy);

        const { rows } = await this.client.execute(query, params, { prepare: true });

        return groupSumResultsBy(rows, groupColumn, queries.emoteUsagesColumn);
    }

    async getEmoteMetadata(emote_ids) {
        const query = queries.buildFetchEmoteMetadataQuery(emote_ids.length);
        const params = emote_ids;

        const { rows } = await this.client.execute(query, params, { prepare: true });

        return groupResultsBy(rows, queries.customEmoteIdColumn);
    }
}

/**
 * Groups objects from an array into a single object by using the given columns to derive the key/value of the final object
 * 
 * @param {{}[]}} objects An array of objects to group
 * @param {string} keyColumn The column to use for the new Object's keys
 * @param {string} valueColumn The column to use for the new Object's values
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
