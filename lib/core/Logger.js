class Logger {
    constructor() {
        this.callbacks = [];
        this.labels = {};

        this.registerLabel("debug", 0);
        this.registerLabel("info", 10);
        this.registerLabel("warn", 20);
        this.registerLabel("error", 30);
        this.registerLabel("critical", 50);
        this.defaultLevel = this.labels.info;
    }

    setDefaultLevel(level) {
        if(typeof level === "string") {
            if(this.labels[level]) {
                throw new Error(`Label ${level} doesn't exist`);
            }
            else {
                this.defaultLevel = this.labels[level];
            }
        }
        else {
            this.defaultLevel = level;
        }
    }

    registerLabel(label, level) {
        if(this.labels[label]) {
            throw new Error(`Label ${label} already exists with severity ${this.labels[label]}`);
        }
        this.labels[label] = level;
    }

    registerListener(level, func) {
        if(typeof level === "string") {
            if(this.labels[level]) {
                level = this.labels[level];
            }
            else {
                throw new Error(`No valid severity level found for label ${level}`);
            }
        }

        this.callbacks.push({level, func});
    }

    log(level, args) {
        let label = "";
        if(typeof level === "string") {
            label = level;
            level = this.getLevel(label);
        }

        let message = args.map((entry) => {
            if(typeof entry === "object") {
                if(entry instanceof Error) {
                    return entry.stack;
                }
                else if(entry.toString() === "[object Object]") {
                    return JSON.stringify(entry, null, 2);
                }
            }
            return entry.toString();
        });
        message = message.join(" ");

        /* eslint-disable no-console */
        if(level >= this.defaultLevel) {
            if(label) {
                console.log(`[${label.toUpperCase()}] ${message}`);
            }
            else {
                console.log(message);
            }
        }
        /* eslint-enable no-console */

        const validCallbacks = this.callbacks.filter(c => level >= c.level);
        validCallbacks.forEach((c) => {
            c.func({ label, level, message, data: args });
        });
    }

    info(...args) {
        this.log("info", args);
    }

    debug(...args) {
        this.log("debug", args);
    }

    warn(...args) {
        this.log("warn", args);
    }

    error(...args) {
        this.log("error", args);
    }

    critical(...args) {
        this.log("critical", args);
    }

    getLevel(label) {
        if(!this.labels.hasOwnProperty(label)) {
            throw new Error(`No valid severity level found for label ${label}`);
        }

        return this.labels[label];
    }
}

module.exports = new Logger();
