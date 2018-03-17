const Constants = require("../core/Constants");
const logger = console.log;

const idRegex = "([1-9][0-9]{0,19})";
const serverFilter = `(?:server:${ idRegex })`;
const userFilter = `(?:user:${ idRegex })|(?:<@!?${ idRegex }>)`;
const emoteFilter = `(?:${ Constants.CUSTOM_REGEX.source })|(${ Constants.UNICODE_REGEX.source })`;
const filtersRegex = new RegExp(`^${serverFilter}|${userFilter}|${emoteFilter}$`, "ug");

const emotes = {
    permissions: Constants.PERMISSIONS.Everyone,
    cooldown: 1000,
    run: async function(client, m, args) {
        let response;
        const filters = parseFilters(args);
        if (Object.keys(filters).length != args.length) {
            response = `Invalid filter${args.length === 1 ? '' : 's'}`;
        } else {
            const results = await client.database.fetch(filters);
            response = `Got ${results.length} results`;
        }
        m.channel.createMessage(response);
    }
}

function parseFilters(args) {
    const filters = {};
    for (const arg of args) {
        let match = filtersRegex.exec(arg);
        if (match) {
            const [ full_match, server_id, user_id, user_id_mention, custom_emote_id, unicode_emote, unicode_emote_escaped ] = match;
            if (server_id) {
                filters.server = server_id;
            } else if (user_id || user_id_mention) {
                filters.user = user_id || user_id_mention;
            } else if (custom_emote_id) {
                filters.emote = custom_emote_id;
            } else if (unicode_emote && !unicode_emote_escaped) {
                filters.emote = unicode_emote;
            }
        }
        // Reset the regex
        filtersRegex.lastIndex = 0;
    }
    return filters;
}

module.exports = emotes;