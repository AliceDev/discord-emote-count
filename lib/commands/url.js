const { PERMISSIONS } = require("../core/Constants");

module.exports = {
    permissions: [],
    guildOnly: false,
    cooldown: 2000,
    shortDescription: 'Sends the invitation url of the bot',
    longDescription: 'Sends you an url you can use to invite the bot to the server of your choice.',
    run: async function(client, m, args) {
        const dmChannel = await client.client.getDMChannel(m.author.id);

        await dmChannel.createMessage(`Hello! My url is https://discordapp.com/oauth2/authorize?client_id=${client.client.user.id}&scope=bot.`);
    }
}
