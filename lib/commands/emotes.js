const Constants = require("../core/Constants");
const { topNEntries } = require("../../config/config.json");
const _ = require("lodash");
const logger = require("../core/Logger.js");
const filterRegexes = {
    guild: [
        { regex: /server:([1-9][0-9]{0,19})/g, onMatch: match => match[1] },
        { regex: /server:here/g, onMatch: match => "here" },
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

module.exports = {
    permissions: Constants.PERMISSIONS.Everyone,
    cooldown: 1000,
    shortDescription: 'Sends statistics about emote usage',
    usage: '[filters...]',
    example: 'server:here user:me',
    longDescription: `Filters will remove any entry that does not match all of the filters.
For example, if you send an emote in the server with id 1 and then run the command with \`server:2\`, it will not count that emote in the results.

__**Available filters**__
    \`server:id\` --> \`id\` is the id of a server
    \`server:here\` --> uses the current server's id if the command is used in a server
    \`user:id\` --> \`id\` is the id of a user (you can also directly mention a user)
    \`user:me\` --> uses your id
    \`emote:id\` --> \`id\` is the id of a custom emote
    You can also use any emote, custom or not, to filter by it

__**How to get ids**__
To get a custom emote's id, send it with a \\ in front.
    Example: \`\\:myemote:\` --> \`<:myemote:id>\` (\`id\` is a long number)
To get a user's id, you can mention them with a \\ in front (won't notify).
    Example: \`\\@Someone#1234\` --> \`<@id>\` (\`id\` is a long number)
To get a server's id, enable Settings > Appearance > Advanced > Developer Mode.
    Once that's done, right click (or hold on mobile) a server > Copy ID.
Note: You can also use the developer mode to get a user's id.
    If you do that, be careful not to copy a message's id.

__**Default filters**__
If you do not provide a filter for either a server or a user and:
    - the command is used in a server --> applies \`server:here\`
    - the command is not used in a server --> applies \`user:me\`
`,
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
            const totalEntries = _.sumBy(entries, x => x[1]);
            entries.sort((a, b) => b[1] - a[1]);
            entries.splice(topNEntries);

            if (entries.length > 0) {
                const keys = entries.map(x => x[0]);
                const keyMap = await buildKeyMap(keys, groupBy, client);
                const description = emoteDataToGraph(entries, totalEntries, keyMap, 5);
                
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
 * Returns a string containing the entries formatted as a bar graph
 * 
 * @param {[][]} entries An array of [label, value] to display
 * @param {number} total The total value of entries
 * @param {{}} labelMap A map of label --> displayed label
 * @param {number} width The maximum width of the bars
 * @returns {string} The resulting string to be displayed
 */
function emoteDataToGraph(entries, total, labelMap, width) {
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
        return "emote";
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
                    return key;
                }
                const { name, animated, guild_id } = metadata;
                let result = `[${name}](https://cdn.discordapp.com/emojis/${key}.png)`;
                if (checkEmoteStillInGuild(client, key, guild_id)) {
                    result += ` (<${animated ? "a" : ""}:${name}:${key}>)`;
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
    if (!(filters.guild || filters.user)) {
        if (message.channel.guild) {
            filters.guild = message.channel.guild.id;
        } else {
            filters.user = message.author.id;
        }
    }
    if (filters.user && filters.user.toLowerCase() === "me") {
        filters.user = message.author.id;
    }
    if (filters.guild && filters.guild.toLowerCase() === "here" && message.channel.guild) {
        filters.guild = message.channel.guild.id;
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
