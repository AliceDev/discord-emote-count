const _ = require("lodash");
const config = require("./config.json");
const defaultConfig = require("./default.json");

module.exports = _.defaults({}, config, defaultConfig);
