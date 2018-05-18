const idTutorial = `To get a custom emote's id, send it with a \\ in front.
    Example: \`\\:myemote:\` --> \`<:myemote:id>\` (\`id\` is a long number)
To get a user's id, you can mention them with a \\ in front (won't notify).
    Example: \`\\@Someone#1234\` --> \`<@id>\` (\`id\` is a long number)
To get a server's id, enable Settings > Appearance > Advanced > Developer Mode.
    Once that's done, right click (or hold on mobile) a server > Copy ID.
Note: You can also use the developer mode to get a user's id.
    If you do that, be careful not to copy a message's id.`;

module.exports = {
    permissions: [],
    guildOnly: false,
    cooldown: 5000,
    hidden: true,
    shortDescription: 'How to get ids',
    longDescription: idTutorial,
    run: async function(client, m, args) {
        await m.channel.createMessage(idTutorial);
    }
}
