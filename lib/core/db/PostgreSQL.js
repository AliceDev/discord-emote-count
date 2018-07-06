const { Pool } = require("pg");
const pool = new Pool(); // Uses environment variables: https://node-postgres.com/features/connecting
const queries = require("./PostgreSQLQueries");
const logger = require("../Logger.js");
const { groupSumResultsBy, groupResultsBy } = require("../Utils");

class PostgreSQL {
    constructor(pool) {
        this.pool = pool;
        this.latestLatencies = [];
    }

    async checkTable() {
        await this.executeQueries(queries.createTables);
        logger.info("Tables created.");
        await this.executeQueries(queries.createIndexes);
        logger.info("Indexes created.");
    }

    async wipeData() {
        await this.executeQueries(queries.wipeData);
        logger.info("Data wiped.");
    }

    async dropTables() {
        await this.executeQueries(queries.dropTables);
        logger.info("Tables dropped.");
    }

    async execute(query, params) {
        const startTime = Date.now();
        logger.debug("Querying:", query);
        logger.debug("With params:", params);
        const result = await this.pool.query(query, params);
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

    async fetchChannels(channel_ids) {
        const { query, params } = queries.buildFetchChannels(channel_ids);

        const { rows } = await this.execute(query, params);
        
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

        return groupSumResultsBy(rows, groupColumn, queries.emoteUsagesColumn, !filters.duplicate);
    }

    async getEmoteMetadata(emote_ids) {
        if (emote_ids.length < 1) {
            return {};
        }
        
        const { rows } = await this.execute(queries.fetchEmoteMetadata, [ emote_ids ]);

        return groupResultsBy(rows, queries.customEmoteIdColumn);
    }

    async connect({ dropTables, wipeData, createTables }) {
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

module.exports = new PostgreSQL(pool);
