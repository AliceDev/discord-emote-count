module.exports.timestampFromId = (id) => {
    return (id / 4194304) + 1420070400000;
};

module.exports.timestampToId = (timestamp) => {
    return (timestamp - 1420070400000) * 4194304;
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
