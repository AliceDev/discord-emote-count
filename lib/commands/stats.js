const { humanizeTime, getCPULoad } = require("../core/Utils");
const execAsync = require("util").promisify(require("child_process").exec);

module.exports = {
    permissions: ["developer"],
    hidden: true,
    guildOnly: false,
    cooldown: 5000,
    shortDescription: 'Outputs bot statistics',
    longDescription: 'Outputs relevant bot-related statistics.\n\nOnly developers have access to this command.',
    run: async function(client, m, args) {
        let repoURL = require("../../package.json").repository.url.slice(4, -4);
        let { version } = require("../../package.json");
        let latestCommit = await execAsync("git rev-parse HEAD");
        latestCommit = latestCommit.stdout.toString().trim();
        let messagesPerMinute = (client.ws.MESSAGE_CREATE) / client.client.uptime * 60e3;
        let load = await getCPULoad();
        let embed = {
            title: "Bot Statistics",
            description: `Version: v${version} ([${latestCommit.slice(0, 7)}](${repoURL}/commit/${latestCommit}))`,
            fields: [
                {
                    name: "CPU Load",
                    value: (load.ratio * 100).toFixed(2) + "%",
                    inline: true
                },
                {
                    name: "Memory Usage",
                    value: (process.memoryUsage().heapUsed / 2**20).toFixed(3) + " MiB",
                    inline: true
                },
                {
                    name: "Uptime",
                    value: humanizeTime(client.client.uptime),
                    inline: true
                },
                {
                    name: "Guild Count",
                    value: client.client.guilds.size,
                    inline: true
                },
                {
                    name: "User Count",
                    value: client.client.users.size,
                    inline: true
                },
                {
                    name: "Messages per Minute",
                    value: messagesPerMinute.toPrecision(3).toString(),
                    inline: true
                }
            ]
        }
        await m.channel.createMessage({ embed });
    }
}
