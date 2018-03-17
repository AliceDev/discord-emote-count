const fs = require("graceful-fs");
const path = require("path");
const logger = console.log;

const COMMAND_DIRECTORY = "./commands";

class CommandHandler {
    constructor(config, client) {
        this.prefix = config.prefix;
        this.client = client;
        this.update();
    }

    update() {
        this.commands = new Map;
        this.cooldowns = new Map;
        let dir = fs.readdirSync(path.join(__dirname, COMMAND_DIRECTORY));
        for(let command of dir) {
            let commandName = command.slice(0, -3).toLowerCase();
            try {
                let commandBody = require(`./commands/${command}`);
                this.commands.set(commandName, commandBody);
                logger(`Successfully loaded command '${commandName}'`);
            }
            catch(err) {
                logger(`Error loading command '${commandName}': ${err.toString()}`);
            }
        }
    }

    parse(message) {
        let m = message.content.slice(this.prefix.length);
        let args = m.split(" ");
        let commandName = args.splice(0, 1)[0].toLowerCase();
        let command = this.commands.get(commandName);

        if(command) {
            let lastRun = this.cooldowns.get(commandName + ":" + message.channel.id);
            
            if(!lastRun || Date.now() - lastRun > command.cooldown) {
                this.cooldowns.set(commandName + ":" + message.channel.id, Date.now());
                command.run(this.client, message, args);
            }
            else {
                logger("Debug", `Command '${commandName}' exceeded cooldowns in channel '${message.channel.id}'`);
            }
        }
        else {
            logger("Debug", `Command '${commandName}' was not found.`);
        }
    }
}

module.exports = CommandHandler;