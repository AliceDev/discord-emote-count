class ChannelLogger {
    constructor() {

    }

    setClient(client) {
        this.client = client;
    }

    logToChannel(channel, packet) {
        const logColors = {
            info: 0x00FFFF,
            warn: 0xFFFF00,
            error: 0xFFA500,
            critical: 0xFF0000
        };

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