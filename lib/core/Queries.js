const queries = {};

queries.createTables = [
    " CREATE TABLE IF NOT EXISTS emotes "
        + " ( "
        + "     id UUID PRIMARY KEY, "
        + "     server_id bigint, "
        + "     user_id bigint, "
        + "     emote_id text, "
        + "     sent_at timestamp, "
        + "     usages smallint "
        + " ); ",
    " CREATE TABLE IF NOT EXISTS custom_emote_metadata "
        + " ( "
        + "     id bigint PRIMARY KEY, "
        + "     name text, "
        + "     animated boolean"
        + " ); ",
];
queries.emoteUsagesColumn = "usages";
queries.customEmoteIdColumn = "id";
queries.customEmoteNameColumn = "name";
queries.wipeData = [
    " TRUNCATE emotes; ",
    " TRUNCATE custom_emote_metadata; ",
];
queries.dropTables = [
    " DROP TABLE IF EXISTS emotes ",
    " DROP TABLE IF EXISTS custom_emote_metadata ",
];
queries.createIndexes = [
    " CREATE INDEX IF NOT EXISTS ON emotes(server_id); ",
    " CREATE INDEX IF NOT EXISTS ON emotes(user_id); ",
    " CREATE INDEX IF NOT EXISTS ON emotes(emote_id); ",
];
queries.insertEmoteMetadata = " INSERT INTO custom_emote_metadata "
    + " (id, name, animated) VALUES (?, ?, ?); ";
queries.buildFetchEmoteMetadataQuery = (howMany) => {
    const entries = Array(howMany).fill("?");
    const requestParams = entries.join(", ");

    return `SELECT id, name, animated FROM custom_emote_metadata WHERE id IN (${requestParams}); `;
};
queries.insertEmote = " INSERT INTO emotes "
    + " (id, server_id, user_id, emote_id, sent_at, usages) "
    + " VALUES "
    + " (uuid(), ?, ?, ?, ?, ?); "; // Uses a UUID to optimize writes at the cost of reads
queries.getData = " SELECT * FROM emotes ";
queries.filtersPrefix = " WHERE ";
queries.filtersSeparator = " AND ";
queries.filtersSuffix = " ALLOW FILTERING ; ";
queries.filters = {
    server: " server_id = ? ",
    user: " user_id = ? ",
    emote: " emote_id = ? ",
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
    server: "server_id",
    user: "user_id",
    emote: "emote_id"
};
queries.parseGroupBy = (groupBy) => {
    return queries.groupBys[groupBy];
};

module.exports = queries;
