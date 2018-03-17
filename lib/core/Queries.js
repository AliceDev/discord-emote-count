const queries = {};

queries.createTable = " CREATE TABLE IF NOT EXISTS emotes "
    + " ( "
    + "     id UUID PRIMARY KEY, "
    + "     server_id bigint, "
    + "     user_id bigint, "
    + "     emote_id text, "
    + "     sent_at timestamp, "
    + "     usages smallint "
    + " ); ";
queries.wipeData = " TRUNCATE emotes; ";
queries.createIndexes = [
    " CREATE INDEX IF NOT EXISTS ON emotes(server_id); ",
    " CREATE INDEX IF NOT EXISTS ON emotes(user_id); ",
    " CREATE INDEX IF NOT EXISTS ON emotes(emote_id); ",
];
queries.insertEmote = " INSERT INTO emotes "
    + " (id, server_id, user_id, emote_id, sent_at, usages) "
    + " VALUES "
    + " (uuid(), ?, ?, ?, ?, ?); ";
queries.getData = " SELECT * FROM emotes ";
queries.filtersPrefix = " WHERE ";
queries.filtersSeparator = " AND ";
queries.filtersSuffix = " ; ";
queries.multipleFiltersSuffix = " ALLOW FILTERING ";
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
    if (filterQueries.length > 1) {
        query += queries.multipleFiltersSuffix;
    }
    query += queries.filtersSuffix;

    return { query, params };
};

module.exports = queries;
