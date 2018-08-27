const DBOTS_BASE_URL = "https://bots.discord.pw/api";

module.exports.DBOTS_BASE_URL = DBOTS_BASE_URL;

module.exports.DBOTS_POST_GUILD_COUNT = (bot_id) => `${DBOTS_BASE_URL}/bots/${bot_id}/stats`;
