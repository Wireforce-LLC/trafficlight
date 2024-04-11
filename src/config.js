const { readFileSync } = require("fs");
const { parse } = require("toml");
const fs = require("node:fs");
const _ = require("lodash");

/**
 * Attempt to read configuration data from a default or specific TOML file.
 */
let configDataRaw = null;

/**
 * Check for the existence of config.default.toml, then config.toml,
 * and read the file content if exists.
 */
if (fs.existsSync(`${process.cwd()}/config.default.toml`)) {
  configDataRaw = fs.readFileSync(`${process.cwd()}/config.default.toml`);
} else if (fs.existsSync(`${process.cwd()}/config.toml`)) {
  configDataRaw = fs.readFileSync(`${process.cwd()}/config.toml`);
} else {
  configDataRaw = null;
}

/**
 * Parse the TOML configuration file content into a JavaScript object.
 */
const configFile = parse(configDataRaw);

/**
 * Class for managing application configuration.
 *
 * @deprecated
 */
class Configurator {
  /**
   * Get database path from configuration.
   *
   * @param {string} path - The path to query.
   * @returns {string} The database path.
   */
  getDbPath(path) {
    return _.find(
      _.get(configFile, "databases.mongodb.paths"),
      (i) => i[0] === path,
    )[1];
  }

  /**
   * Get a configuration value by its path.
   *
   * @param {string} path - The path to query.
   * @param {*} $default - The default value to return if the path does not exist.
   * @returns {*} The value from the configuration file or the default value.
   */
  get(path, $default = null) {
    return _.get(configFile, path, $default);
  }

  /**
   * Check if the provided credentials match any user in the configuration.
   *
   * @param {string} scheme - The authentication scheme.
   * @param {string} login - The user login.
   * @param {string} password - The user password.
   * @returns {boolean} True if the credentials match a user, false otherwise.
   */
  checkAuthorizationValidity(scheme, login, password) {
    return !!_.find(this.get(`auth.${scheme}`, {}), (user) => {
      return user[0] === login && user[1] === password;
    });
  }
}

module.exports = { configFile, $configurator: new Configurator() };
