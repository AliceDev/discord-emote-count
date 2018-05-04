module.exports = {
    permissions: ["developer"],
    guildOnly: true,
    cooldown: 5000,
    shortDescription: 'Evaluates a command',
    longDescription: 'Evaluates arbitrary code. Only developers have access to this command.',
    run: async function(client, m, args) {
        let expression = args.join(" ").replace(/```(\S+\n)?/gi, "");
        let message = m;
        try {
            let result = eval(expression);

            // Result returned a Promise
            if(result.toString() === "[object Promise]") {
                let now = new Date().getTime();
                result.then((...values) => {
                    let duration = (new Date().getTime()) - now;
                    m.channel.createMessage(`\`\`\`js\nIn:\n${expression}\nPromise resolved after ${duration}ms\nOut:\n${values}\n\`\`\``);
                }).catch((err) => {
                    let duration = (new Date().getTime()) - now;
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
}
