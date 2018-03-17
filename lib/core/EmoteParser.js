const Constants = require("./Constants");
const _ = require("lodash");

function parseMessage(message, onEntry) {
    const guild = message.channel.guild;
    if (guild) {
        const server_id = message.channel.guild.id;
        const user_id = message.author.id;
        const sent_at = message.timestamp;

        const allMatches = [];
        parseContent(message.content, Constants.CUSTOM_REGEX, match => allMatches.push(match[1]));
        parseContent(message.content, Constants.UNICODE_REGEX, match => {
            if (!match[1]) { // If no \
                allMatches.push(match[0])
            }
        });

        Object.entries(_.countBy(allMatches)).forEach(([emote_id, usages]) => {
            onEntry(server_id, user_id, emote_id, sent_at, usages);
        });

        console.log("Counts:", _.countBy(allMatches));
    }
}

function parseContent(message, regex, onMatch) {
    while (match = regex.exec(message)) {
        onMatch(match);
    }
}

module.exports = parseMessage;
