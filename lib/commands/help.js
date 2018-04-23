const { PERMISSIONS } = require("../core/Constants");

module.exports = {
    permissions: PERMISSIONS.Everyone,
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
            const commandList = formatCommandList(prefix, commands);
            response = { embed: { description: commandList, footer: { text: `Type '${prefix}help command' for more information about a command.` } } };
        } else {
            const commandName = args.join(' ');
            const command = commands.get(commandName);
            if (!command) {
                response = { embed: { description: `The command '${commandName}' was not found.` } };
            } else {
                response = { embed: { description: formatCommand(prefix, commandName, command) } };
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
 * @returns {string} The formatted help message
 */
function formatCommandList(prefix, commands) {
    let commandList = '';

    for (let [commandName, command] of commands) {
        commandList += `**${prefix}${commandName}**\t${command.shortDescription}\n`;
    }

    return commandList;
}
