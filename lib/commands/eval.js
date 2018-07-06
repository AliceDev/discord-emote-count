module.exports = {
    permissions: ["developer"],
    hidden: true,
    guildOnly: true,
    cooldown: 5000,
    shortDescription: "Evaluates a command",
    longDescription: "Evaluates arbitrary code.\n\nOnly developers have access to this command.",
    run: async function(client, m, args) {
        const expression = args.join(" ").replace(/```(\S+\n)?/gi, "");
        try {
            const result = eval(expression);

            // Result returned a Promise
            if(result.toString() === "[object Promise]") {
                const now = new Date().getTime();
                result.then((...values) => {
                    const duration = (new Date().getTime()) - now;
                    m.channel.createMessage(`\`\`\`js\nIn:\n${expression}\nPromise resolved after ${duration}ms\nOut:\n${values}\n\`\`\``);
                }).catch((err) => {
                    const duration = (new Date().getTime()) - now;
                    m.channel.createMessage(`\`\`\`diff\nIn:\n${expression}\nPromise rejected after ${duration}ms\nError:\n- ${err.toString()}\n\`\`\``);
                });
            }
            else {
                m.channel.createMessage(`\`\`\`js\nIn:\n${expression}\nOut:\n${result}\n\`\`\``);
            }
        }
        catch(err) {
            m.channel.createMessage(`\`\`\`diff\nIn:\n${expression}\nError:\n- ${err.toString()}\n\`\`\``);
        }
    }
};
