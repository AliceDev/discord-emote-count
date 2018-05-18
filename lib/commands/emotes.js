const Constants = require("../core/Constants");
const { defaultEntriesLimit, maxEntriesLimit, prefix, developerIDs } = require("../../config/config.json");
const _ = require("lodash");
const logger = require("../core/Logger.js");
const { timestampFromId, dehumanizeTime } = require("../core/Utils");
const filterRegexes = {
    guild: {
        multiple: true,
        regexes: [
            { regex: /(?:server|guild):([1-9][0-9]{0,19})/ig, onMatch: match => match[1] },
            { regex: /(?:server|guild):here/ig, onMatch: match => "here" },
            { regex: /(?:server|guild):all/ig, onMatch: match => "all" },
        ],
    },
    user: {
        multiple: true,
        regexes: [
            { regex: /user:([1-9][0-9]{0,19})/ig, onMatch: match => match[1] },
            { regex: /user:me/ig, onMatch: match => "me" },
            { regex: /<@!?([1-9][0-9]{0,19})>/ig, onMatch: match => match[1] },
        ],
    },
    emote: {
        multiple: true,
        regexes: [
            { regex: /emote:([1-9][0-9]{0,19})/ig, onMatch: match => match[1] },
            { regex: Constants.CUSTOM_REGEX, onMatch: match => match[3] },
            { regex: new RegExp(`(${Constants.UNICODE_REGEX.source})`, "ug"), onMatch: match => match[2] ? undefined : match[1] },
        ],
    },
    duplicate: {
        multiple: false,
        regexes: [
            { regex: /duplicate:(no?|ye?s?)/ig, onMatch: match => match[1].toLowerCase().startsWith("n") ? false : true },
        ],
    },
    order: {
        multiple: false,
        regexes: [
            { regex: /order:(as?c?e?n?d?i?n?g?|de?s?c?e?n?d?i?n?g?)/ig, onMatch: match => match[1].toLowerCase().startsWith("a") ? true : false },
        ],
    },
    limit: {
        multiple: false,
        regexes: [
            { regex: /limit:([1-9][0-9]*)/ig, onMatch: match => {
                    const n = parseInt(match[1]);
                    if (n > maxEntriesLimit) return;
                    return n;
                }
            },
        ],
    },
    since: {
        multiple: false,
        regexes: [
            { regex: /since:([1-9][0-9]{0,19})/ig, onMatch: match => Math.floor(timestampFromId(match[1])) },
            { regex: /last:(\d+\w+)/ig, onMatch: match => {
                    const n = dehumanizeTime(match[1].toLowerCase());
                    if (n < 0) return;
                    const result = Date.now() - n;
                    if (result < 1420070400000) return; // 1420070400000 is the Discord epoch
                    return result;
                }
            },
        ],
    },
    visibility: {
        multiple: false,
        regexes: [
            { regex: /visibility:(global|visible|server)/ig, onMatch: match => match[1].toLowerCase() },
        ],
    },
};
const defaultFilters = { duplicate: true, order: false, limit: defaultEntriesLimit, visibility: 'global' };

/**
 * Filters for emote database requests
 * @typedef {Object} Filters
 * @property {?string[]} user The list of users to keep in the results
 * @property {?string[]} guild The list of guilds to keep in the results
 * @property {?string[]} emote The list of emotes to keep in the results
 * @property {boolean} duplicate false if multiple emotes in the same message should count as 1
 * @property {boolean} order true if the ordering should be ascending
 * @property {number} limit The number of entries displayed
 * @property {number} since Results from messages after that message id will be kept
 * @property {string} visibility The criteria for keeping emote entries
 */

module.exports = {
    permissions: [],
    guildOnly: true,
    cooldown: 1000,
    shortDescription: 'Sends statistics about emote usage',
    usage: '[filters...]',
    example: 'server:here user:me',
    longDescription: `Filters will remove any entry that does not match all of the filters.
For example, if you send an emote in the server with id 1 and then run the command with \`server:2\`, it will not count that emote in the results.

__**Getting ids**__
If you don't know how to get ids, you can do \`${prefix}help id\`.

__**Available filters**__
For more information about the filters, you can do \`${prefix}filters\`.

__**Default filters**__
If you do not provide a filter for either a server or a user and:
    - the command is used in a server --> applies \`server:here\`
    - the command is not used in a server --> applies \`user:me\`
`,
    run: async function(client, m, args) {
        let response;
        const filters = parseFilters(args);
        if (!filters || (filters.guild && filters.guild.includes('all') && !developerIDs.includes(m.author.id))) {
            response = `Invalid filter${args.length === 1 ? '' : 's'}`;
        } else {
            fixFilters(filters, m);
            const groupBy = getGroupByFromFilters(filters);

            const rawResults = await client.database.fetch(filters, groupBy);
            
            const rawEntries = Object.entries(rawResults);
            const guild_id = m.channel.guild && m.channel.guild.id;
            const keyMapBuilder = async keys => await buildKeyMap(keys, filters, groupBy, client, guild_id);
            const entries = await filterEntries(rawEntries, filters, keyMapBuilder);
            const totalEntries = _.sumBy(entries, x => x[1]);

            if (entries.length > 0) {
                const description = emoteDataToGraph(entries, totalEntries, 5);
                
                embed = { title: "Results", color: 0x00ff00, description };
                if (groupBy === "emote") {
                    embed.footer = { text: "If an emote isn't displayed, it's because I don't have access to it." };
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
 * Filters entries depending on the given specified filters
 * Note: The given entries will be modified, but will not contain the result
 * 
 * @param {[][]} entries An array of [label, value] to filter
 * @param {Filters} filters The filters
 * @param {function} keyMapBuilder A function taking a list of keys and returns the keyMap for those keys
 * @returns {[][]} The resulting filtered entries
 */
async function filterEntries(entries, filters, keyMapBuilder) {
    if (filters.order) {
        entries.sort((a, b) => a[1] - b[1]);
    } else {
        entries.sort((a, b) => b[1] - a[1]);
    }
    const result = [];
    for (let i = 0; result.length < filters.limit && i < entries.length; i += filters.limit) {
        const idsToFetch = [];
        const entriesToFetch = [];
        for (let j = i; j < i + filters.limit && j < entries.length; j++) {
            idsToFetch.push(entries[j][0]);
            entriesToFetch.push(entries[j]);
        }
        const keyMap = await keyMapBuilder(idsToFetch);
        for (let j = 0; j < entriesToFetch.length && result.length < filters.limit; j++) {
            const label = keyMap[entriesToFetch[j][0]];
            const value = entriesToFetch[j][1];
            if (label !== undefined) {
                result.push([label, value]);
            }
        }
    }
    return result;
}

/**
 * Returns a string containing the entries formatted as a bar graph
 * 
 * @param {[][]} entries An array of [label, value] to display
 * @param {number} total The total value of entries
 * @param {number} width The maximum width of the bars
 * @returns {string} The resulting string to be displayed
 */
function emoteDataToGraph(entries, total, width) {
    const totalPercent = 100 / total;

    const maximum = _.maxBy(entries, o => o[1])[1] / width;
    return entries.reduce((result, [label, value]) => {
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
        return "emote";
    }
}

/**
 * Creates a map to convert keys into displayable strings
 * 
 * @param {string[]} keys Array of keys to use to build the map
 * @param {Filters} filters The filters to define what to do in some specific cases
 * @param {string} groupBy The column used to group the results
 * @param {*} client The client used to find relevant information if necessary
 * @param {?string} currentGuild_id The current guild's id
 * @returns {{}} The key map
 */
async function buildKeyMap(keys, filters, groupBy, client, currentGuild_id) {
    let mapFunc;
    switch (groupBy) {
        case "user":
            mapFunc = key => `<@!${key}>`;
            break;
        case "guild":
            mapFunc = key => {
                const guild = client.client.guilds.get(key);
                return guild ? guild.name : "Not found";
            };
            break;
        case "emote":
            const idsToFetch = keys.filter(key => /[1-9][0-9]{0,19}/g.exec(key));
            const emotesMetadata = await client.database.getEmoteMetadata(idsToFetch);
            mapFunc = key => {
                const metadata = emotesMetadata[key];
                if (!metadata) {
                    return filters.visibility !== 'server' ? key : undefined;
                }
                const { name, animated, guild_id } = metadata;
                let result = `[${name}](https://cdn.discordapp.com/emojis/${key}.png)`;
                if (checkEmoteStillInGuild(client, key, guild_id)) {
                    result += ` (<${animated ? "a" : ""}:${name}:${key}>)`;
                } else if (filters.visibility === 'visible') {
                    return;
                }
                if (filters.visibility === 'server' && (!guild_id || guild_id.toString() !== currentGuild_id)) {
                    return;
                }
                return result;
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
 * Checks if an emote is still a the specified guild
 * 
 * @param {*} client The client used to access the database and the guilds
 * @param {string} emote_id The ID of the emote to check
 * @param {Long} [guild_id] The ID of the guild to check
 * @returns {boolean} true if the emote is still in the given guild; false otherwise
 */
function checkEmoteStillInGuild(client, emote_id, guild_id) {
    if (!guild_id) {
        return false;
    }
    const stringGuild_id = guild_id.toString();

    const guild = client.client.guilds.get(stringGuild_id);
    if (!guild) {
        client.database.unsetEmoteGuild(emote_id);
        return false;
    }

    const emoteIndex = guild.emojis.findIndex(e => e.id === emote_id);
    if (emoteIndex < 0) {
        client.database.unsetEmoteGuild(emote_id);
        return false;
    }

    return true;
}

/**
 * Verifies filters to ensure at least a guild or a user is specified
 * 
 * This exists mostly to prevent querying *all* data.
 * 
 * @param {Filters} filters Filters to verify
 * @param {{author: {id: string}, channel: {guild: ?{id: string}}}} message The message to use to fill in the missing filters
 */
function fixFilters(filters, message) {
    if (filters.user) {
        filters.user = filters.user.map(v => v.toLowerCase() === "me" ? message.author.id : v);
    }
    if (filters.guild && message.channel.guild) {
        filters.guild = filters.guild.map(v => v.toLowerCase() === "here" ? message.channel.guild.id : v);
    }
    
    if (!(filters.guild || filters.user)) {
        if (message.channel.guild) {
            filters.guild = [ message.channel.guild.id ];
        } else {
            filters.user = [ message.author.id ];
        }
    }
    
    if (filters.guild && filters.guild.includes("all")) {
        delete filters.guild;
    }
}

/**
 * Parses the arguments given into an object containing each filter's value
 * 
 * @param {string[]} args A list of arguments passed to the command
 * @returns {Filters}
 */
function parseFilters(args) {
    const filters = { ...defaultFilters };
    for (const arg of args) {
        let matched = false;
        for (let [filterName, filter] of Object.entries(filterRegexes)) {
            const { multiple, regexes } = filter;
            for (const { regex, onMatch } of regexes) {
                let match = regex.exec(arg);
                if (match) {
                    const value = onMatch(match);
                    if (value !== undefined) {
                        if (multiple) {
                            filters[filterName] = filters[filterName] || [];
                            filters[filterName].push(value);
                        } else {
                            filters[filterName] = value;
                        }
                        matched = true;
                    }
                }
                // Reset the regex
                regex.lastIndex = 0;
            }
        }
        if (!matched) return;
    }
    return filters;
}
