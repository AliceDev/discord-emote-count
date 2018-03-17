class Database {
    async checkTable() {}
    insert(server_id, user_id, emote_id, sent_at, usages) {}
    async wipeEmotes() {}
    async getServer(server_id) {}
    async getUser(user_id) {}
    async getEmote(emote_id) {}
}

module.exports = Database;
