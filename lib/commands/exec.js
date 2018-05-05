module.exports = {
    permissions: ["developer"],
    hidden: true,
    guildOnly: true,
    cooldown: 5000,
    shortDescription: 'Executes statements',
    longDescription: 'Executes zero or more statements. Requires a return statement.\n\nOnly developers have access to this command.',
    run: async function(client, m, args) {
        let expression = args.join(" ").replace(/```(\S+\n)?/gi, "");
        let message = m;
        let result = eval(`(async function(){${expression}}())`);

        let now = new Date().getTime();
        result.then((...values) => {
            let duration = (new Date().getTime()) - now;
            m.channel.createMessage(`\`\`\`js\nIn:\n${expression}\nPromise resolved after ${duration}ms\nOut:\n${values}\n\`\`\``);
        }).catch((err) => {
            let duration = (new Date().getTime()) - now;
            m.channel.createMessage(`\`\`\`diff\nIn:\n${expression}\nPromise rejected after ${duration}ms\nError:\n- ${err.toString()}\n\`\`\``);
        });
    }
}
