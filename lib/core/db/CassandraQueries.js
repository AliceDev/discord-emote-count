const queries = {};

queries.createTables = [
    " CREATE TABLE IF NOT EXISTS emotes "
        + " ( "
        + "     guild_id bigint, "
        + "     user_id bigint, "
        + "     emote_id text, "
        + "     sent_at timestamp, "
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
        + "     id bigint PRIMARY KEY, "
        + " ); ",
    " CREATE TABLE IF NOT EXISTS channels "
        + " ( "
        + "     channel_id bigint PRIMARY KEY, "
        + "     latest_parsed_id bigint, "
        + "     earliest_parsed_id bigint, "
        + "     latest_unparsed_id bigint, "
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
];
queries.dropTables = [
    " DROP TABLE IF EXISTS emotes; ",
    " DROP TABLE IF EXISTS custom_emote_metadata; ",
    " DROP TABLE IF EXISTS guilds; ",
    " DROP TABLE IF EXISTS channels; ",
];
queries.createIndexes = [
];
queries.buildUpdateChannel = (channel_id, { latestParsed_id, earliestParsed_id, latestUnparsed_id }) => {
    const params = [ channel_id ];
    const columns = [ "channel_id" ];
    if (latestParsed_id !== undefined) {
        columns.push("latest_parsed_id");
        params.push(latestParsed_id);
    }
    if (earliestParsed_id !== undefined) {
        columns.push("earliest_parsed_id");
        params.push(earliestParsed_id);
    }
    if (latestUnparsed_id !== undefined) {
        columns.push("latest_unparsed_id");
        params.push(latestUnparsed_id);
    }

    const query = ` INSERT INTO channels (${columns.join(", ")}) VALUES (${Array(params.length).fill("?").join(", ")}); `;
    
    return { query, params };
};
queries.buildFetchChannels = (channel_ids) => {
    const filters = channel_ids.length > 0 ? " WHERE channel_id IN ?; " : " ; ";
    const query = " SELECT "
        + " channel_id, latest_parsed_id, earliest_parsed_id, latest_unparsed_id "
        + " FROM channels " + filters;
    const params = [ channel_ids ];

    return { query, params };
};
queries.insertGuild = " INSERT INTO guilds (id) VALUES (?); ";
queries.fetchGuilds = " SELECT id FROM guilds; ";
queries.removeGuilds = " DELETE FROM guilds WHERE id IN ?; ";
queries.insertEmoteMetadata = " INSERT INTO custom_emote_metadata "
    + " (id, name, animated, guild_id) VALUES (?, ?, ?, ?); ";
queries.unsetEmoteGuildMetadata = " UPDATE custom_emote_metadata SET "
    + "     guild_id = null "
    + " WHERE id = ?; ";
queries.updateEmotesGuild = " UPDATE custom_emote_metadata SET "
    + "     guild_id = ? "
    + " WHERE id IN ?; ";
queries.fetchEmoteMetadata = "SELECT id, name, animated, guild_id "
    + " FROM custom_emote_metadata "
    + " WHERE id IN ?; ";
queries.insertEmote = " INSERT INTO emotes "
    + " (guild_id, user_id, emote_id, sent_at, usages) "
    + " VALUES "
    + " (?, ?, ?, ?, ?); ";
queries.deleteEmotes = " DELETE FROM emotes WHERE guild_id = ? AND user_id = ? AND sent_at = ?; ";
queries.getData = " SELECT * FROM emotes ";
queries.filtersPrefix = " WHERE ";
queries.filtersSeparator = " AND ";
queries.filtersSuffix = " ALLOW FILTERING ; ";
queries.filters = {
    guild: " guild_id IN ? ",
    user: " user_id IN ? ",
    emote: " emote_id IN ? ",
};
queries.parseFilters = (filters) => {
    const filterEntries = Object.entries(filters);
    const params = [];
    let query = queries.getData;
    if (filterEntries.length > 0) {
        query += queries.filtersPrefix;
    }
    const filterQueries = [];
    for (let [filter, value] of filterEntries) {
        filterQueries.push(queries.filters[filter]);
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

module.exports = queries;
