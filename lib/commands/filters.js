const { defaultEntriesLimit } = require('../../config/config.json');

module.exports = {
    permissions: [],
    guildOnly: false,
    cooldown: 45000,
    shortDescription: 'Posts information about filters',
    longDescription: '*In case you\'re wondering why it isn\'t in here, it\'s because of its size.*',
    run: async function(client, m, args) {
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

Using multiple filters of the same category will keep any of the given values.
This currently only applies to the server, user, and emote filters.
    Example: \`user:me @Someone#1234\` --> entries for me or Someone#1234
    Example: \`🤔 👌\` --> entries for 🤔 or 👌
    Example: \`server:here user:me 🤔 👌\` --> my entries for 🤔 or 👌 in the server`);
    }
}
