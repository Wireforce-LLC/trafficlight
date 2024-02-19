const {readFileSync} = require("fs");

const config = JSON.parse(String(readFileSync(`${process.cwd()}/config.json`)))

module.exports = {config}