const Database = require("./Database");
const { Client } = require("cassandra-driver");
const client = new Client({ contactPoints: ["localhost"], keyspace: "emotes"});
const queries = require("./Queries");
const config = require("../../config/config.json");
const _ = require("lodash");
const logger = console.log;

class Cassandra extends Database {
    constructor(client) {
        super();
        this.client = client;
        this.batch = [];
        this.applyBatch = _.throttle(this.applyBatch, config.insertionThrottle, { leading: false });
    }

    async checkTable() {
        await this.client.execute(queries.createTable, [], { prepare: true });
        logger("The table has been created if it didn't exist already.");
        for (const query of queries.createIndexes) {
            await this.client.execute(query, [], { prepare: true });
        }
        logger("Indexes created.");
    }

    insert(server_id, user_id, emote_id, sent_at, usages) {
        this.batch.push({
            query: queries.insertEmote,
            params: [ server_id, user_id, emote_id, sent_at, usages ],
        });
        this.applyBatch();
    }

    async applyBatch() {
        await this.client.batch(this.batch, { prepare: true });
        logger(`Executed batch of ${this.batch.length} queries.`);
        this.batch.length = 0;
    }

    async wipeEmotes() {
        await this.client.execute(queries.wipeData, [], { prepare: true });
    }

    async fetch(filters, groupBy) {
        const { query, params } = queries.parseFilters(filters);
        const groupColumn = queries.parseGroupBy(groupBy);

        const { rows } = await this.client.execute(query, params, { prepare: true });

        return groupResultsBy(rows, groupColumn, "usages");
    }
}

/**
 * Groups objects from an array into an object by doing a sum of sumBy for all objects with the same groupBy value
 * 
 * @param {{}[]} objects An array of objects to group
 * @param {string} groupBy The column to use for grouping
 * @param {string} sumBy The column to use for summing
 * @returns {{}} The grouped object
 */
function groupResultsBy(objects, groupBy, sumBy) {
    return objects.reduce((acc, current) => {
        const key = current[groupBy];
        acc[key] = acc[key] || 0;
        acc[key] += current[sumBy] || 0;
        return acc;
    }, {});
}

module.exports = new Cassandra(client);
