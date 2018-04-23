const logColors = require("./core/Constants.js").CHANNEL_LOG_COLORS;

class ChannelLogger {
    constructor(channel) {
        this.channel = channel;
    }

    logToChannel(packet) {
        // TODO: Queue frequent log messages and send in one embed
        let embed = {
            color: logColors[packet.label] ? logColors[packet.label] : 0xFFFFFF,
            title: packet.label ? packet.label.toUpperCase() : `Level: ${packet.level}`,
            description: packet.message,
            footer: {
                text: (new Date()).toTimeString().slice(0,8)
            }
        };

        this.channel.createMessage({ embed }).catch(() => {});
    }
}

module.exports = ChannelLogger;