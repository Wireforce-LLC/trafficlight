const {readFileSync} = require("fs");
const {parse} = require("toml");
const fs = require("node:fs");
const _ = require("lodash");

const config = JSON.parse(String(readFileSync(`${process.cwd()}/config.json`)))

let configDataRaw = null

if (fs.existsSync(`${process.cwd()}/config.default.toml`)) {
	configDataRaw = fs.readFileSync(`${process.cwd()}/config.default.toml`)
} else if (fs.existsSync(`${process.cwd()}/config.toml`)) {
	configDataRaw = fs.readFileSync(`${process.cwd()}/config.toml`)
} else {
	configDataRaw = null
}

const configFile = parse(configDataRaw);

class Configurator {
	getDbPath(path) {
		return _.find(_.get(configFile, 'databases.mongodb.paths'), i => i[0] === path)[1]
	}

	get(path, $default = null) {
		return _.get(configFile, path, $default)
	}

	checkAuthorizationValidity(scheme, login, password) {
		return !!_.find(
			this.get(`auth.${scheme}`, {}),
			user => {
				return user[0] === login && user[1] === password
			}
		)
	}
}

module.exports = {config, configFile, $configurator: new Configurator()}