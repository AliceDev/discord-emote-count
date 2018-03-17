module.exports = {
    createTable: " CREATE TABLE IF NOT EXISTS emotes "
            + " ( "
            + "     id UUID PRIMARY KEY, "
            + "     server_id bigint, "
            + "     user_id bigint, "
            + "     emote_id text, "
            + "     sent_at timestamp, "
            + "     usages smallint "
            + " ); ",
    wipeData: " TRUNCATE emotes; ",
    createIndexes: [
        " CREATE INDEX IF NOT EXISTS ON emotes(server_id); ",
        " CREATE INDEX IF NOT EXISTS ON emotes(user_id); ",
        " CREATE INDEX IF NOT EXISTS ON emotes(emote_id); ",
    ],
    getServer: " SELECT * FROM emotes WHERE server_id = ?; ",
    getUser: " SELECT * FROM emotes WHERE user_id = ?; ",
    getEmote: " SELECT * FROM emotes WHERE emote_id = ?; ",
    insertEmote: " INSERT INTO emotes (id, server_id, user_id, emote_id, sent_at, usages) VALUES (uuid(), ?, ?, ?, ?, ?); ",
};
