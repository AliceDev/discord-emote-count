const Constants = require("../core/Constants");
const _ = require("lodash");
const logger = console.log;

const filterRegexes = {
    server: [
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

            const rawResults = await client.database.fetch(filters, groupBy);

            const results = await mapGroupedKeys(rawResults, groupBy, client);

            if (Object.keys(results).length > 0) {
                embed = { title: "Results", color: 0x00ff00 };
                embed.description = graphify(results, 5, 5);
                if (groupBy === "emote") {
                    embed.footer = { text: "If all emotes display as `:name:`, it's because I don't have access to one of them." };
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
 * Displays the results in a bar graph using keys as labels
 * 
 * @param {{}} results Object containing name: value pairs
 * @param {number} width The maximum width of the bars
 * @param {number} height The height of the graph (aka topN entries)
 */
function graphify(results, width, height) {
    const total = _.sum(Object.values(results));
    const totalPercent = 100 / total;

    const entries = Object.entries(results);
    entries.sort((a, b) => b[1] - a[1]);
    entries.splice(height);

    let maximum = entries[0][1] / width;
    return entries.reduce((result, [label, value]) => {
        if (label === "undefined") {
            return `${value}`;
        }
        const graphBar = "█".repeat(Math.round(value / maximum));
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
    } else if (!filters.server) {
        return "server";
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
        case "server":
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
 * Maps the keys of `results` depending on the column used to group the results
 * 
 * @param {{}} results The results object to map
 * @param {string} groupBy The column used to group the results
 * @param {*} client The client used to find relevant information if necessary
 * @returns The mapped results
 */
async function mapGroupedKeys(results, groupBy, client) {
    const keyMap = await buildKeyMap(Object.keys(results), groupBy, client);
    return Object.entries(results).reduce((acc, [key, value]) => {
        acc[keyMap[key]] = value;
        return acc;
    }, {});
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