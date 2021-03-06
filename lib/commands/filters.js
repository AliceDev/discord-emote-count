const { defaultEntriesLimit } = require("../../config");

module.exports = {
    permissions: [],
    guildOnly: false,
    cooldown: 45000,
    shortDescription: "Posts information about filters",
    longDescription: "*In case you're wondering why it isn't in here, it's because of its size.*",
    run: async function(client, m) {
        await m.channel.createMessage(`
**Available filters**
    \`server:id\` --> \`id\` is the id of a server
    \`server:here\` --> uses the current server's id if the command is used in a server
    \`user:id\` --> \`id\` is the id of a user (you can also directly mention a user)
    \`user:me\` --> uses your id
    \`emote:id\` --> \`id\` is the id of a custom emote
    You can also directly use any emote, custom or not, to filter by it
        Example: \`🤔 :emote:\` (assuming you have access to an emote named 'emote')
    \`duplicate:no\` --> doesn't count duplicate emotes in messages
    \`order:ascending\` --> put the least used emotes on top instead of bottom
    \`limit:n\` --> displays **n** results (defaults to ${defaultEntriesLimit})
    \`since:id\` --> keeps entries from messages sent since the message with id \`id\`
    \`last:time\` --> keeps entries from messages sent in the last \`time\`
        Example: \`last:2mo3w4d\` for the last 2 months, 3 weeks, and 4 days
        \`time\`'s units can be: ms, s, m, h, d, w, mo, or y
    \`visibility:value\` --> \`value\` can be one of global, visible, and server
        If value is server, it will only keep custom emotes from that server
        If value is visible, it will only keep emotes visible by the bot
        Otherwise, it will display all emotes regardless of being visible or not

Using multiple filters of the same category will keep any of the given values.
This currently only applies to the server, user, and emote filters.
    Example: \`user:me @Someone#1234\` --> entries for me or Someone#1234
    Example: \`🤔 👌\` --> entries for 🤔 or 👌
    Example: \`server:here user:me 🤔 👌\` --> my entries for 🤔 or 👌 in the server`);
    }
};
