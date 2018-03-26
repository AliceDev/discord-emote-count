const Constants = require("../core/Constants");
const _ = require("lodash");
const logger = console.log;

/**
 * The top N number of entries to display
 */
const topNEntries = 5;

const filterRegexes = {
    guild: [
        { regex: /server:([1-9][0-9]{0,19})/g, onMatch: match => match[1] },
    ],
    user: [
        { regex: /user:([1-9][0-9]{0,19})/g, onMatch: match => match[1] },
        { regex: /user:me/g, onMatch: match => "me" },
        { regex: /<@!?([1-9][0-9]{0,19})>/g, onMatch: match => match[1] },
    ],
    emote: [
        { regex: Constants.CUSTOM_REGEX, onMatch: match => match[3] },
        { regex: new RegExp(`(${Constants.UNICODE_REGEX.source})`, "ug"), onMatch: match => match[2] ? false : match[1] },
    ],
};

/**
 * Filters for emote database requests
 * @typedef {{user: ?string, guild: ?string, emote: ?string}} Filters
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

            const rawResults = await client.database.fetch(filters, groupBy);
            
            const entries = Object.entries(rawResults);
            entries.sort((a, b) => b[1] - a[1]);
            entries.splice(topNEntries);

            const keys = entries.map(x => x[0]);
            const keyMap = await buildKeyMap(keys, groupBy, client);

            if (entries.length > 0) {
                embed = { title: "Results", color: 0x00ff00 };
                embed.description = graphify(entries, keyMap, 5);
                if (groupBy === "emote") {
                    embed.footer = { text: "If all emotes display as `:name:`, it's because I don't have access to at least one of them." };
                }
                response = { embed };
            } else {
                response = "No results";
            }
        }
        m.channel.createMessage(response);
    }
}

/**
 * Displays the entries in a bar graph
 * 
 * @param {[][]} entries An array of [label, value] to display
 * @param {{}} labelMap A map of label --> displayed label
 * @param {number} width The maximum width of the bars
 */
function graphify(entries, labelMap, width) {
    const total = _.sumBy(entries, x => x[1]);
    const totalPercent = 100 / total;

    let maximum = entries[0][1] / width;
    return entries.reduce((result, [rawLabel, value]) => {
        const label = labelMap[rawLabel];
        if (label === "undefined") {
            return `${value}`;
        }
        const graphBar = "█".repeat(Math.ceil(value / maximum));
        const valuePercent = Math.round(value * totalPercent);
        return result + `${graphBar} ${label} ${valuePercent}% (${value} / ${total})\n`;
    }, "");
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
    } else if (!filters.guild) {
        return "guild";
    } else {
        return "none";
    }
}

/**
 * Creates a map to convert keys into displayable strings
 * 
 * @param {string[]} keys Array of keys to use to build the map
 * @param {string} groupBy The column used to group the results
 * @param {*} client The client used to find relevant information if necessary
 * @returns {{}} The key map
 */
async function buildKeyMap(keys, groupBy, client) {
    let mapFunc;
    switch (groupBy) {
        case "user":
            mapFunc = key => `<@!${key}>`;
            break;
        case "guild":
            mapFunc = key => client.guilds.find(g => g.id === key).name || "Not found";
        case "emote":
            const idsToFetch = keys.filter(key => /[1-9][0-9]{0,19}/g.exec(key));
            const emotesMetadata = await client.database.getEmoteMetadata(idsToFetch);
            mapFunc = key => {
                const metadata = emotesMetadata[key];
                if (!metadata) {
                    return key;
                }
                const { name, animated } = metadata;
                return `<${animated ? "a" : ""}:${name}:${key}>`;
            };
            break;
        default:
            return keys;
    }
    return keys.reduce((acc, key) => {
        acc[key] = mapFunc(key);
        return acc;
    }, {});
}

/**
 * Verifies filters to ensure at least a guild or a user is specified
 * If no guild if specified and the command is ran in a guild, use that guild
 * If not ran in a guild and no user filter is specified, use the author
 * 
 * This exists mostly to prevent querying *all* data.
 * 
 * @param {Filters} filters Filters to verify
 * @param {{author: {id: string}, channel: {guild: ?{id: string}}}} message The message to use to fill in the missing filters
 */
function fixFilters(filters, message) {
    if (!filters.guild && message.channel.guild) {
        filters.guild = message.channel.guild.id;
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
        for (let [filter, regexes] of Object.entries(filterRegexes)) {
            for (const { regex, onMatch } of regexes) {
                let match = regex.exec(arg);
                if (match) {
                    const value = onMatch(match);
                    if (value !== false) {
                        filters[filter] = value;
                    }
                }
                // Reset the regex
                regex.lastIndex = 0;
            }
        }
    }
    return filters;
}

module.exports = emotes;