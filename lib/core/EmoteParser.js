const Constants = require("./Constants");
const _ = require("lodash");
const logger = console.log;

function parseMessage(content, onEntry, onEmote) {
    const allMatches = [];
    parseContent(content, Constants.CUSTOM_REGEX, match => {
        allMatches.push(match[2]);
        onEmote(match[2], match[1]);
    });
    parseContent(content, Constants.UNICODE_REGEX, match => {
        if (!match[1]) { // If no \
            allMatches.push(match[0]);
        }
    });

    Object.entries(_.countBy(allMatches)).forEach(([emote_id, usages]) => {
        onEntry(emote_id, usages);
    });

    logger("Counts:", _.countBy(allMatches));
}

function parseContent(message, regex, onMatch) {
    while (match = regex.exec(message)) {
        onMatch(match);
    }
}

module.exports = parseMessage;
