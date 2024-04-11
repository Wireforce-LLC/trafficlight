const fs = require("node:fs");
const { parse } = require("toml");
const { $loggerKit } = require("./LoggerKit");
const _ = require("lodash");

class ConfiguratorKit {
  defaultTomlPath = `${process.cwd()}/config.default.toml`;
  userTomlPath = `${process.cwd()}/config.toml`;

  constructor() {
    let configDataRaw;

    if (fs.existsSync(this.defaultTomlPath)) {
      configDataRaw = fs.readFileSync(this.defaultTomlPath);
      $loggerKit
        .getLogger()
        .info(`Used '${this.defaultTomlPath}' as config file`);
    } else if (fs.existsSync(this.userTomlPath)) {
      configDataRaw = fs.readFileSync(this.userTomlPath);
      $loggerKit.getLogger().info(`Used '${this.userTomlPath}' as config file`);
    } else {
      configDataRaw = null;
    }

    this.configData = parse(configDataRaw);
  }

  get(path, $default = null) {
    return _.get(this.configData, path, $default);
  }

  getDbPath(path) {
    return _.find(this.get("databases.mongodb.paths"), (i) => i[0] === path)[1];
  }

  checkAuthorizationValidity(scheme, login, password) {
    return !!_.find(this.get(`auth.${scheme}`, {}), (user) => {
      return user[0] === login && user[1] === password;
    });
  }
}

const $configuratorKit = new ConfiguratorKit();

module.exports = { $configuratorKit };
