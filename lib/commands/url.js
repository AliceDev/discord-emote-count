const { PERMISSIONS } = require("../core/Constants");

const ping = {
    permissions: PERMISSIONS.Everyone,
    cooldown: 2000,
    run: async function(client, m, args) {
        const dmChannel = await client.client.getDMChannel(m.author.id);

        await dmChannel.createMessage(`Hello! My url is https://discordapp.com/oauth2/authorize?client_id=${client.client.user.id}&scope=bot.`);
    }
}

module.exports = ping;
