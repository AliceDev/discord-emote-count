const Constants = require("./Constants");
const _ = require("lodash");

function parseMessage(content, onEntry, onEmote) {
    const allMatches = [];
    parseContent(content, Constants.CUSTOM_REGEX, match => {
        allMatches.push(match[3]);
        if (onEmote) {
            match.splice(0, 1);
            const [ animated, emote_name, emote_id ] = match;
            const is_animated = animated === "a";
            
            onEmote(emote_id, emote_name, is_animated);
        }
    });
    parseContent(content, Constants.UNICODE_REGEX, match => {
        if (!match[1]) { // If no \
            allMatches.push(match[0]);
        }
    });

    Object.entries(_.countBy(allMatches)).forEach(([emote_id, usages]) => {
        onEntry(emote_id, usages);
    });
}

function parseContent(message, regex, onMatch) {
    let match = regex.exec(message);
    while (match) {
        onMatch(match);
        match = regex.exec(message);
    }
}

module.exports = { parseMessage };
