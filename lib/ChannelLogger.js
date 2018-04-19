const logColors = require("../config/config.json").CHANNEL_LOG_COLORS;

class ChannelLogger {
    constructor() {

    }

    logToChannel(channel, packet) {
        // TODO: Queue frequent log messages and send in one embed
        let embed = {
            color: logColors[packet.label] ? logColors[packet.label] : 0xFFFFFF,
            title: packet.label ? packet.label.toUpperCase() : `Level: ${packet.level}`,
            description: packet.message,
            footer: {
                text: (new Date()).toTimeString().slice(0,8)
            }
        };

        channel.createMessage({ embed }).catch(() => {});
    }
}

module.exports = new ChannelLogger();