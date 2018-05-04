const _ = require("lodash");

module.exports = {
    permissions: ["manageMessages"],
    guildOnly: true,
    cooldown: 5000,
    shortDescription: 'Sends the latency information',
    longDescription: 'Sends the bot\'s latency to the Discord servers and to various tools used by the bot.',
    run: async function(client, m, args) {
        const db = client.database;

        const content = `Pong! (Shard ${m.channel.guild.shard.id} Latency: ${m.channel.guild.shard.latency}ms)`
            + `\n${client.database.constructor.name} Latency: ${db.latestLatencies[0]}ms `
            + `(Avg. of the last ${db.latestLatencies.length} queries: ~${Math.round(_.mean(db.latestLatencies))}ms)`;
        
        m.channel.createMessage(content);
    }
}
