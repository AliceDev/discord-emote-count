const request = require("request-promise-native");
const Endpoints = require("./Endpoints.js");

class RequestHandler {
    constructor(clientID) {
        this.clientID = clientID;
    }

    async request(method, uri, body,  headers) {
        let options = { method, uri, body, headers };
        if(method === "POST" && body) {
            options.json = true;
        }
        
        try {
            const result = await request(options);
            return result;
        }
        catch (err) {
            throw err;
        }
    }
}

module.exports = RequestHandler;