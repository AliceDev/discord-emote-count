const fs = require("graceful-fs");
const path = require("path");
const logger = require("./core/Logger.js");
const { memberHasCommandPermission } = require("./core/Utils");
const config = require("../config");

const sleep = require("util").promisify(setTimeout);

const COMMAND_DIRECTORY = "./commands";

class CommandHandler {
    constructor(prefix, client) {
        this.prefix = prefix;
        this.client = client;
        this.update();
    }

    update() {
        this.commands = new Map;
        this.cooldowns = new Map;
        const dir = fs.readdirSync(path.join(__dirname, COMMAND_DIRECTORY));
        for(const command of dir) {
            const commandName = command.slice(0, -3).toLowerCase();
            try {
                const commandBody = require(`./commands/${command}`);
                this.commands.set(commandName, commandBody);
                logger.debug(`Successfully loaded command '${commandName}'`);
            }
            catch(err) {
                logger.debug(`Error loading command '${commandName}': ${err.toString()}`);
            }
        }
    }

    parse(message) {
        const m = message.content.slice(this.prefix.length);
        const args = m.split(" ");
        const commandName = args.splice(0, 1)[0].toLowerCase();
        const command = this.commands.get(commandName);

        if(!command) {
            return logger.debug(`Command '${commandName}' was not found.`);
        }

        if(!message.channel.permissionsOf(this.client.client.user.id).has("sendMessages")) {
            addTemporaryReaction(message, "📝");
            return logger.debug(`Cannot send messages in ${message.channel.id}`);
        }

        if(!message.channel.guild && command.guildOnly) {
            return message.channel.createMessage("This command must be run in a server!");
        }

        if(!config.developerIDs.includes(message.author.id)) {
            const lastRun = this.cooldowns.get(commandName + ":" + message.channel.id);
            if(lastRun && Date.now() - lastRun < command.cooldown) {
                addTemporaryReaction(message, "⏱", command.cooldown - Date.now() + lastRun);
                return logger.debug(`Command '${commandName}' exceeded cooldowns in channel '${message.channel.id}'`);
            }

            if(!memberHasCommandPermission(command, message.member)) {
                addTemporaryReaction(message, "👮");
                return logger.debug(`Member '${message.author.id}' lacks permission to run command '${commandName}'`);
            }
        }

        this.cooldowns.set(commandName + ":" + message.channel.id, Date.now());
        command.run(this.client, message, args);
        addTemporaryReaction(message, "✅");
    }
}

async function addTemporaryReaction(message, reaction, howLong) {
    if(!config.reactToCommands) return;
    try {
        await message.addReaction(reaction);
        await sleep(howLong || 7000);
        await message.removeReaction(reaction);
    }
    catch(err) {
        // Do nothing for now
    }
}

module.exports = CommandHandler;
