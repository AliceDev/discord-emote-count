const { PERMISSIONS } = require("../core/Constants");
const { reactToCommands } = require("../../config/config.json");
const { memberHasCommandPermission } = require("../core/Utils");

module.exports = {
    permissions: [],
    guildOnly: false,
    cooldown: 2000,
    shortDescription: 'Sends information about commands',
    usage: '[command]',
    example: 'emotes',
    longDescription: `If no command is given, sends the list of commands.
If a command is given, sends additional information about that command.
    `,
    run: async function(client, m, args) {
        const { commands, prefix } = client.commandHandler;
        const { user } = client.client;

        let response;
        if (!args.length) {
            const commandList = formatCommandList(prefix, commands, m.member);
            response = { embed: { description: commandList, footer: { text: `Type '${prefix}help command' for more information about a command.` } } };
        } else {
            const commandName = args.join(' ');
            const command = commands.get(commandName);
            if (command && memberHasCommandPermission(command, m.member)) {
                response = { embed: { description: formatCommand(prefix, commandName, command) } };
            } else {
                response = { embed: { description: `The command '${commandName}' was not found.` } };
            }
        }

        response.embed.author = { name: `${user.username} Help`, icon_url: user.avatarURL };
        response.embed.color = Math.round(parseInt(user.discriminator) / 10000 * 0xFFFFFF);

        m.channel.createMessage(response);
    }
}

function formatCommand(prefix, commandName, command) {
    let description = `Usage: \`${prefix}${commandName} ${command.usage || ''}\``;

    if (command.example) {
        description += `\nExample: \`${prefix}${commandName} ${command.example}\``;
    }
    description += `\n\n__**${command.shortDescription}**__\n${command.longDescription || ''}`;

    return description;
}

/**
 * Formats the given commands into a formatted command list
 * 
 * @param {string} prefix The bot's command prefix
 * @param {Map} commands Map of commandName --> command
 * @param {Eris.Member} member The author of the message to check their permissions
 * @returns {string} The formatted help message
 */
function formatCommandList(prefix, commands, member) {
    let commandList = '';

    for (let [commandName, command] of commands) {
        if (memberHasCommandPermission(command, member)) {
            commandList += `**${prefix}${commandName}**\t${command.shortDescription}\n`;
        }
    }

    commandList += `\n__**Bot's reactions on commands**__
❌ --> Command not found
⏱ --> Command on cooldown in that channel
👮 --> You don't have the permission to do that
✅ --> Command successfully executed`;

    return commandList;
}