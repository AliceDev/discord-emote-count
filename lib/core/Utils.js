module.exports.timestampFromId = (id) => {
    return (id / 4194304) + 1420070400000;
};

module.exports.timestampToId = (timestamp) => {
    return (timestamp - 1420070400000) * 4194304;
};

const TIME_CONSTANTS = [
    { name: "ms", fraction: 1000 },
    { name: "s", fraction: 60 },
    { name: "m", fraction: 60 },
    { name: "h", fraction: 24 },
    { name: "d", fraction: 7 },
];
const BIGGEST_TIME_NAME = "w";
/**
 * Converts milliseconds into a human readable string
 * Examples: 60000 --> 1m; 262800000 --> 3d 1h; 262800999 --> 3d 1h
 * 
 * @param {number} timeMs A number of milliseconds to convert
 * @returns {string} The humanized string
 */
module.exports.humanizeTime = (timeMs) => {
    const times = [];
    let time = timeMs;
    let units;
    for (let { name, fraction } of TIME_CONSTANTS) {
        units = time % fraction;
        time = Math.floor(time / fraction);

        if (units > 0) {
            times.unshift(units + name);
        }
    }
    if (time > 0) {
        times.unshift(time + BIGGEST_TIME_NAME);
    }
    return times.slice(-2).join(" ");
};

let bashColors = {
    none: "\033[0m",
    black: "\033[0;30m",
    red: "\033[0;31m",
    green: "\033[0;32m",
    orange: "\033[0;33m",
    blue: "\033[0;34m",
    purple: "\033[0;35m",
    cyan: "\033[0;36m",
    lightGray: "\033[0;37m",
    darkGray: "\033[1;30m",
    lightRed: "\033[1;31m",
    lightGreen: "\033[2;32m",
    yellow: "\033[3;33m",
    lightBlue: "\033[4;34m",
    lightPurple: "\033[5;35m",
    lightCyan: "\033[6;36",
    white: "\033[7;37m",
};
if (process.env.COLORS !== "true") {
    bashColors = Object.keys(bashColors).reduce((acc, v) => {
        acc[v] = "";
        return acc;
    }, {});
}
module.exports.bashColors = bashColors;
