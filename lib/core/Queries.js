module.exports.createTable = " CREATE TABLE IF NOT EXISTS emotes "
    + " ( "
    + "     id UUID PRIMARY KEY, "
    + "     server_id bigint, "
    + "     user_id bigint, "
    + "     emote_id text, "
    + "     sent_at timestamp, "
    + "     usages smallint "
    + " ); ";
module.exports.wipeData = " TRUNCATE emotes; ";
module.exports.createIndexes = [
    " CREATE INDEX IF NOT EXISTS ON emotes(server_id); ",
    " CREATE INDEX IF NOT EXISTS ON emotes(user_id); ",
    " CREATE INDEX IF NOT EXISTS ON emotes(emote_id); ",
];
module.exports.insertEmote = " INSERT INTO emotes "
    + " (id, server_id, user_id, emote_id, sent_at, usages) "
    + " VALUES "
    + " (uuid(), ?, ?, ?, ?, ?); ";
module.exports.getData=  " SELECT * FROM emotes ";
module.exports.filtersPrefix = " WHERE ";
module.exports.filtersSeparator = " AND ";
module.exports.filtersSuffix = " ; ";
module.exports.filters = {
    server: " server_id = ? ",
    user: " user_id = ? ",
    emote: " emote_id = ? ",
};
module.exports.parseFilters = (filters) => {
    const filterEntries = Object.entries(filters);
    const params = [];
    let query = module.exports.getData;
    if (filterEntries.length > 0) {
        query += module.exports.filtersPrefix;
    }
    for (const [filter, value] of filterEntries) {
        query += module.exports.filters[filter];
        params += value;
    }
    return query + module.exports.filtersSuffix;
};
