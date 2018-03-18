const Constants = require("../core/Constants");
const logger = console.log;

const idRegex = "([1-9][0-9]{0,19})";
const serverFilter = `(?:server:${ idRegex })`;
const userFilter = `(?:user:${ idRegex }|(me))|(?:<@!?${ idRegex }>)`;
const emoteFilter = `(?:${ Constants.CUSTOM_REGEX.source })|(${ Constants.UNICODE_REGEX.source })`;
const filtersRegex = new RegExp(`^${serverFilter}|${userFilter}|${emoteFilter}$`, "ug");

/**
 * Filters for emote database requests
 * @typedef {{user: ?string, server: ?string, emote: ?string}} Filters
 */

const emotes = {
    permissions: Constants.PERMISSIONS.Everyone,
    cooldown: 1000,
    run: async function(client, m, args) {
        let response;
        const filters = parseFilters(args);
        if (Object.keys(filters).length != args.length) {
            response = `Invalid filter${args.length === 1 ? '' : 's'}`;
        } else {
            fixFilters(filters, m);
            const groupBy = getGroupByFromFilters(filters);
            logger(`Grouping by ${groupBy}`);

            const results = await client.database.fetch(filters, groupBy);
            
            logger("Results:", results);

            response = `Got results`;
        }
        m.channel.createMessage(response);
    }
}

/**
 * Derive which column the results will be grouped by from the filters used in the query
 * 
 * @param {Filters} filters The filters from which to derive the groupBy column
 * @returns {string} The column used to group the results
 */
function getGroupByFromFilters(filters) {
    if (!filters.emote) {
        return "emote";
    } else if (!filters.user) {
        return "user";
    } else if (!filters.server) {
        return "server";
    } else {
        return "none";
    }
}

/**
 * Verifies filters to ensure at least a server or a user is specified
 * If no server if specified and the command is ran in a server, use that server
 * If not ran in a server and no user filter is specified, use the author
 * 
 * This exists mostly to prevent querying *all* data.
 * 
 * @param {Filters} filters Filters to verify
 * @param {{author: {id: string}, channel: {guild: ?{id: string}}}} message The message to use to fill in the missing filters
 */
function fixFilters(filters, message) {
    if (!filters.server && message.channel.guild) {
        filters.server = message.channel.guild.id;
    }
    if (!filters.user) {
        if (!message.channel.guild) {
            filters.user = message.author.id;
        }
    } else if (filters.user.toLowerCase() === "me") {
        filters.user = message.author.id;
    }
}

/**
 * Parses the arguments given into an object containing each filter's value
 * 
 * @param {string[]} args A list of arguments passed to the command
 * @returns {Filters}
 */
function parseFilters(args) {
    const filters = {};
    for (const arg of args) {
        let match = filtersRegex.exec(arg);
        if (match) {
            const [ full_match, server_id, user_id, user_me, user_id_mention, custom_emote_id, unicode_emote, unicode_emote_escaped ] = match;
            if (server_id) {
                filters.server = server_id;
            } else if (user_id || user_me || user_id_mention) {
                filters.user = user_id || user_id_mention || user_me;
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