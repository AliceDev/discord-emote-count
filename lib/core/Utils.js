const _ = require("lodash");
const os = require("os");
const moment = require("moment");
const { developerIDs } = require("../../config/config.json");
const sleep = require("util").promisify(setTimeout);

/**
 * Groups objects from an array into a single object by using the given columns to derive the key/value of the final object
 * 
 * @param {{}[]} objects An array of objects to group
 * @param {string} keyColumn The column to use for the new Object's keys
 * @returns {{}} The grouped object
 */
function groupResultsBy(objects, keyColumn) {
    return objects.reduce((acc, current) => {
        const key = current[keyColumn];
        const value = _.omit(current, keyColumn);
        acc[key] = value;
        return acc;
    }, {});
}

/**
 * Groups objects from an array into an object by doing a sum of sumBy for all objects with the same groupBy value
 * 
 * @param {{}[]} objects An array of objects to group
 * @param {string} groupBy The column to use for grouping
 * @param {string} sumBy The column to use for summing
 * @param {boolean?} shouldCount true if it should count instead of summing by the sumBy column
 * @returns {{}} The grouped object
 */
function groupSumResultsBy(objects, groupBy, sumBy, shouldCount) {
    return objects.reduce((acc, current) => {
        const key = current[groupBy];
        acc[key] = acc[key] || 0;
        acc[key] += shouldCount ? 1 : current[sumBy] || 0;
        return acc;
    }, {});
}

module.exports.groupSumResultsBy = groupSumResultsBy;
module.exports.groupResultsBy = groupResultsBy;

module.exports.timestampFromId = (id) => {
    return (id / 4194304) + 1420070400000;
};

module.exports.timestampToId = (timestamp) => {
    return (timestamp - 1420070400000) * 4194304;
};

/**
 * Converts milliseconds into a human readable string
 * Examples: 60000 --> 1m; 262800000 --> 3d 1h; 262800999 --> 3d 1h
 * 
 * @param {number} timeMs A number of milliseconds to convert
 * @returns {string} The humanized string
 */
module.exports.humanizeTime = (timeMs) => moment.duration(timeMs).humanize();

const translationTable = {
    ms: 'milliseconds',
    y: 'years',
    mo: 'months',
    w: 'weeks',
    d: 'days',
    h: 'hours',
    m: 'minutes',
    s: 'seconds',
};
/**
 * Converts a human readable string into milliseconds
 * Examples: 1m --> 60000; 3d1h --> 262800000
 *
 * @param {string} timeMs A human readable string to convert
 * @returns {number} The total number of milliseconds. Will be negative if it fails to parse.
 */
module.exports.dehumanizeTime = (timeString) => {
    const regex = /([1-9][0-9]*)(ms|s|h|d|w|mo|y|m)/ig;
    let match;
    let hasMatched = false;
    const specifiedTime = {};
    while ((match = regex.exec(timeString)) !== null) {
        hasMatched = true;
        specifiedTime[translationTable[match[2]]] = parseInt(match[1]);
    }
    const shouldInvert = !hasMatched || regex.lastIndex !== 0;
    const result = moment.duration(specifiedTime).asMilliseconds();
    return shouldInvert ? -1 : result;
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

module.exports.memberHasCommandPermission = (command, member) => 
    developerIDs.includes(member.id) || command.permissions.every(permission => member.permission.has(permission));

function getCPUStats() {
    let idle = 0;
    let total = 0;
    let cpus = os.cpus();

    for(let cpu of cpus) {
        for(let type in cpu.times) {
            total += cpu.times[type];
        }

        idle += cpu.times.idle;
    }

    return {idle, total};
}

module.exports.getCPULoad = async (interval = 100) => {
    let currentLoad = getCPUStats();
    await sleep(interval);
    let newLoad = getCPUStats();
    let idle = newLoad.idle - currentLoad.idle;
    let total = newLoad.total - currentLoad.total;
    return {
        idle,
        total,
        ratio: (total - idle) / total
    };
}