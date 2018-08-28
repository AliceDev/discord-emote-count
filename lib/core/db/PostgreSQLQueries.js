const _ = require("lodash");
const queries = {};

queries.createTables = [
    " CREATE TABLE IF NOT EXISTS emotes "
        + " ( "
        + "     guild_id bigint, "
        + "     user_id bigint, "
        + "     emote_id text, "
        + "     sent_at bigint, "
        + "     usages smallint, "
        + "     PRIMARY KEY (guild_id, user_id, sent_at, emote_id) "
        + " ); ",
    " CREATE TABLE IF NOT EXISTS custom_emote_metadata "
        + " ( "
        + "     id bigint PRIMARY KEY, "
        + "     name text, "
        + "     animated boolean, "
        + "     guild_id bigint "
        + " ); ",
    " CREATE TABLE IF NOT EXISTS guilds "
        + " ( "
        + "     id bigint PRIMARY KEY "
        + " ); ",
    " CREATE TABLE IF NOT EXISTS channels "
        + " ( "
        + "     channel_id bigint PRIMARY KEY, "
        + "     latest_parsed_id bigint, "
        + "     earliest_parsed_id bigint, "
        + "     latest_unparsed_id bigint "
        + " ); ",
    " CREATE TABLE IF NOT EXISTS stats "
        + " ( "
        + "     time timestamp with time zone, "
        + "     type text, "
        + "     value bigint "
        + " ); ",
];
queries.emoteUsagesColumn = "usages";
queries.customEmoteIdColumn = "id";
queries.customEmoteNameColumn = "name";
queries.customEmoteServerColumn = "guild_id";
queries.channelsIdColumn = "channel_id";
queries.wipeData = [
    " TRUNCATE emotes; ",
    " TRUNCATE custom_emote_metadata; ",
    " TRUNCATE guilds; ",
    " TRUNCATE channels; ",
    " TRUNCATE stats; ",
];
queries.dropTables = [
    " DROP TABLE IF EXISTS emotes; ",
    " DROP TABLE IF EXISTS custom_emote_metadata; ",
    " DROP TABLE IF EXISTS guilds; ",
    " DROP TABLE IF EXISTS channels; ",
    " DROP TABLE IF EXISTS stats; ",
];
queries.createIndexes = [
];
queries.buildUpdateChannel = (channel_id, { latestParsed_id, earliestParsed_id, latestUnparsed_id }) => {
    const params = [ channel_id ];
    const columns = [ "channel_id" ];
    const paramsQueries = [ "$1" ];
    const columnUpdates = [];
    if (latestParsed_id !== undefined) {
        columns.push("latest_parsed_id");
        params.push(latestParsed_id);
        paramsQueries.push("$" + params.length);
    }
    if (earliestParsed_id !== undefined) {
        columns.push("earliest_parsed_id");
        params.push(earliestParsed_id);
        paramsQueries.push("$" + params.length);
    }
    if (latestUnparsed_id !== undefined) {
        columns.push("latest_unparsed_id");
        params.push(latestUnparsed_id);
        paramsQueries.push("$" + params.length);
    }

    for (const column of columns) {
        columnUpdates.push(`${column} = EXCLUDED.${column}`);
    }
    const query = ` INSERT INTO channels (${columns.join(", ")}) VALUES (${paramsQueries.join(", ")}) `
        + ` ON CONFLICT (channel_id) DO UPDATE SET ${columnUpdates.join(", ")};`;
    
    return { query, params };
};
queries.buildFetchChannels = (channel_ids) => {
    const filters = channel_ids.length > 0 ? " WHERE channel_id = ANY ($1); " : " ; ";
    const query = " SELECT "
        + " channel_id, latest_parsed_id, earliest_parsed_id, latest_unparsed_id "
        + " FROM channels " + filters;
    const params = [ channel_ids ];

    return { query, params };
};
queries.insertGuild = " INSERT INTO guilds (id) VALUES ($1) ON CONFLICT DO NOTHING; ";
queries.fetchGuilds = " SELECT id FROM guilds; ";
queries.removeGuilds = " DELETE FROM guilds WHERE id = ANY ($1); ";
queries.insertEmoteMetadata = " INSERT INTO custom_emote_metadata "
    + " (id, name, animated, guild_id) VALUES ($1, $2, $3, $4) "
    + " ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, guild_id = EXCLUDED.guild_id; ";
queries.unsetEmoteGuildMetadata = " UPDATE custom_emote_metadata SET "
    + "     guild_id = null "
    + " WHERE id = $1; ";
queries.updateEmotesGuild = " UPDATE custom_emote_metadata SET "
    + "     guild_id = $1 "
    + " WHERE id = ANY ($2); ";
queries.fetchEmoteMetadata = "SELECT id, name, animated, guild_id "
    + " FROM custom_emote_metadata "
    + " WHERE id = ANY ($1); ";
queries.insertEmote = " INSERT INTO emotes "
    + " (guild_id, user_id, emote_id, sent_at, usages) "
    + " VALUES "
    + " ($1, $2, $3, $4, $5) "
    + " ON CONFLICT (guild_id, user_id, emote_id, sent_at) DO UPDATE SET usages = EXCLUDED.usages; ";
queries.deleteEmotes = " DELETE FROM emotes WHERE guild_id = $1 AND user_id = $2 AND sent_at = $3; ";
queries.getData = " SELECT guild_id, user_id, emote_id, sent_at, usages FROM emotes ";
queries.filtersPrefix = " WHERE ";
queries.filtersSeparator = " AND ";
queries.filtersSuffix = " ; ";
queries.filters = {
    guild: " guild_id = ANY($<number>)",
    user: " user_id = ANY($<number>)",
    emote: " emote_id = ANY($<number>)",
    since: " sent_at > $<number> ",
};
queries.parseFilters = (filters) => {
    const filterEntries = Object.entries(_.pick(filters, Object.keys(queries.filters)));
    const params = [];
    let query = queries.getData;
    if (filterEntries.length > 0) {
        query += queries.filtersPrefix;
    }
    const filterQueries = [];
    for (const [filter, value] of filterEntries) {
        filterQueries.push(queries.filters[filter].replace("<number>", filterQueries.length + 1));
        params.push(value);
    }
    query += filterQueries.join(queries.filtersSeparator);
    query += queries.filtersSuffix;

    return { query, params };
};
queries.groupBys = {
    none: "emote_id",
    guild: "guild_id",
    user: "user_id",
    emote: "emote_id"
};
queries.parseGroupBy = (groupBy) => {
    return queries.groupBys[groupBy];
};
queries.insertStat = " INSERT INTO stats "
    + " (time, type, value) "
    + " VALUES "
    + " ($1, $2, $3); ";

module.exports = queries;
