const Eris = require("eris");
const Database = require("./core/CassandraDatabase");
const { bashColors: { none, lightGreen } } = require("./core/Utils");

const logger = console.log;

class Background {
    constructor(token, database) {
        this.database = database;
        this.client = new Eris(token);
        this.client.on("ready", this.onReady.bind(this));
    }

    onReady() {
        logger(lightGreen + "Background Ready!" + none);
    }

    connect() {
        this.client.connect();
    }
}

const background = new Background(process.env.BOT_TOKEN, Database);
background.connect();
