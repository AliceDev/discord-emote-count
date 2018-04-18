const _ = require("lodash");

module.exports = {
    permissions: 2,
    cooldown: 5000,
    run: async function(client, m, args) {
        const cassandraLatencies = client.database.latestLatencies;

        const content = `Pong! (Shard ${m.channel.guild.shard.id} Latency: ${m.channel.guild.shard.latency}ms)`
            + `\nCassandra Latency: ${cassandraLatencies[0]}ms `
            + `(Avg. of the last ${cassandraLatencies.length} queries: ~${Math.round(_.mean(cassandraLatencies))}ms)`;
        
        m.channel.createMessage(content);
    }
}
