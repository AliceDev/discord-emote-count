const Endpoints = require("./core/Endpoints.js");
const RequestHandler = require("./core/RequestHandler.js");

class Analytics {
    constructor(clientID) {
        this.clientID = clientID;
        this.requestHandler = new RequestHandler(this.clientID);
    }

    reportGuildCount(server_count) {
        if(process.env.DBOTS_TOKEN) {
            this.requestHandler.request("POST", Endpoints.DBOTS_POST_GUILD_COUNT(this.clientID), { server_count }, { Authorization: process.env.DBOTS_TOKEN });
        }
    }
}

module.exports = Analytics;
