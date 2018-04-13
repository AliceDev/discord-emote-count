class Logger {
    constructor(defaultLevel="info", labels={}) {
        this.defaultLevel = typeof defaultLevel === "string" ? this.getLevel[defaultLevel] : defaultLevel;
        this.labels = labels;
        this.callbacks = [];

        this.registerLabel("debug", 0);
        this.registerLabel("info", 10);
        this.registerLabel("warn", 20);
        this.registerLabel("error", 30);
        this.registerLabel("critical", 50);
    }

    registerLabel(label, level) {
        if(this.labels[label]) {
            throw new Error(`Label ${label} already exists with severity ${this.labels[label]}`);
        }
        else {
            this.labels[label] = level;
        }
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
            if(typeof entry === "object" && entry.toString() === "[object Object]") {
                return JSON.stringify(entry, null, 2);
            }
            return entry.toString();
        });
        message = message.join(" ");
        if(label) {
            message = `[${label.toUpperCase()}] ${message}`;
        }

        if(level >= this.defaultLevel) {
            console.log(message);
        }

        let validCallbacks = this.callbacks.filter(c => level >= c.level);
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
        if(this.labels.hasOwnProperty(label)) {
            return this.labels[label];
        }
        else {
            throw new Error(`No valid severity level found for label ${label}`);
        }
    }
}

module.exports = new Logger();