const request = require("request-promise-native");

class RequestHandler {
    constructor() {
        
    }

    async request(method, uri, body,  headers) {
        const options = { method, uri, body, headers };
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
