const ping = {
    permissions: 2,
    cooldown: 5000,
    run: async function(client, m, args) {
        m.channel.createMessage(`Pong! (Shard ${m.channel.guild.shard.id} | Latency: ${m.channel.guild.shard.latency}ms)`);
    }
}

module.exports = ping;