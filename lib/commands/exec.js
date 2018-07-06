module.exports = {
    permissions: ["developer"],
    hidden: true,
    guildOnly: true,
    cooldown: 5000,
    shortDescription: "Executes statements",
    longDescription: "Executes zero or more statements. Requires a return statement.\n\nOnly developers have access to this command.",
    run: async function(client, m, args) {
        const expression = args.join(" ").replace(/```(\S+\n)?/gi, "");
        const result = eval(`(async function(){${expression}}())`);

        const now = new Date().getTime();
        result.then((...values) => {
            const duration = (new Date().getTime()) - now;
            m.channel.createMessage(`\`\`\`js\nIn:\n${expression}\nPromise resolved after ${duration}ms\nOut:\n${values}\n\`\`\``);
        }).catch((err) => {
            const duration = (new Date().getTime()) - now;
            m.channel.createMessage(`\`\`\`diff\nIn:\n${expression}\nPromise rejected after ${duration}ms\nError:\n- ${err.toString()}\n\`\`\``);
        });
    }
};
