const fs = require("node:fs");
const { parse } = require("toml");
const { $loggerKit } = require("./LoggerKit");
const _ = require("lodash");

class ConfiguratorKit {
  defaultTomlPath = `${process.cwd()}/config.default.toml`;
  userTomlPath = `${process.cwd()}/config.toml`;

  /**
   * ConfiguratorKit constructor.
   *
   * Reads the default TOML configuration file, and if it doesn't exist, reads
   * the user's TOML configuration file. If neither exist, sets the configuration
   * data to null.
   */
  constructor() {
    /**
     * The parsed TOML configuration data.
     * @type {object}
     */
    this.configData = null;

    // Read the default configuration file.
    let configDataRaw;

    try {
      if (fs.existsSync(this.defaultTomlPath)) {
        configDataRaw = fs.readFileSync(this.defaultTomlPath);
      }
    } catch (e) {
      $loggerKit.getLogger().error(`Could not read '${this.defaultTomlPath}'`);
    }

    // Read the user's configuration file.
    try {
      if (configDataRaw === undefined) {
        if (fs.existsSync(this.userTomlPath)) {
          configDataRaw = fs.readFileSync(this.userTomlPath);
        }
      }
    } catch (e) {
      $loggerKit.getLogger().error(`Could not read '${this.userTomlPath}'`);
    }

    // Parse the TOML configuration file content into a JavaScript object.
    try {
      if (configDataRaw !== undefined) {
        this.configData = parse(configDataRaw);
      }
    } catch (e) {
      $loggerKit.getLogger().error("Could not parse configuration file");
    }
  }



  /**
   * Get a configuration value.
   *
   * Get a configuration value using the given path. If the value is not found,
   * it returns the given default value or null.
   *
   * @param {string} path - The path to the configuration value.
   * @param {*} [$default=null] - The default value to return if the path is
   *   not found.
   * @returns {*} The configuration value found in the given path, or the
   *   default value if not found.
   * @throws {Error} If the configuration data is not loaded. Check that the
   *   ConfiguratorKit constructor has been called.
   * @throws {Error} If the path is null or undefined. get called with invalid
   *   path "{path}".
   */
  get(path, $default = null) {
    if (!this.configData) {
      throw new Error(
        "[ConfiguratorKit] Configuration data is not loaded! " +
          "Check that the ConfiguratorKit constructor has been called."
      );
    }

    try {
      return _.get(this.configData, path, $default);
    } catch (e) {
      if (e instanceof TypeError) {
        // _.get throws a TypeError if the path is null or undefined.
        throw new Error(
          `[ConfiguratorKit] get called with invalid path "${path}"`
        );
      } else {
        // Re-throw the error so it can be caught by the user.
        throw e;
      }
    }
  }

  /**
   * Get the database path for the given path.
   *
   * @param {string} path - The path to query.
   * @returns {string|null} The database path, or null if not found.
   */
  getDbPath(path) {
    // Log the path being queried.
    $loggerKit.getLogger().debug("[ConfiguratorKit] getDbPath called with path:", path);
    // Get the database paths from the configuration.
    const dbPaths = this.get("databases.mongodb.paths");
    // Log the database paths.
    $loggerKit.getLogger().debug("[ConfiguratorKit] dbPaths:", dbPaths);
    // Find the database path that matches the given path.
    const dbPath = _.find(dbPaths, (i) => i[0] === path);
    // Log the found database path.
    $loggerKit.getLogger().debug("[ConfiguratorKit] dbPath:", dbPath);
    // Return the database path if found, or null otherwise.
    return dbPath ? dbPath[1] : null;
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
    const authData = this.get(`auth.${scheme}`, null);

    /**
     * Log the authentication data used for checking authorization.
     * @type {object}
     */
    $loggerKit.getLogger().debug("[ConfiguratorKit] checkAuthorizationValidity called with", {
      scheme,
      login,
      password,
      authData,
    });

    if (authData === null) {
      /**
       * If there is no user for the given scheme, return false.
       * @type {boolean}
       */
      return false;
    }

    /**
     * Loop through the users for the given scheme.
     * @type {Array}
     */
    for (const user of authData) {
      /**
       * Log the current user being checked.
       * @type {Array}
       */
      $loggerKit.getLogger().debug("[ConfiguratorKit] Checking user", user);
      if (user[0] === login && user[1] === password) {
        /**
         * If the login and password match, return true.
         * @type {boolean}
         */
        $loggerKit.getLogger().debug("[ConfiguratorKit] User authorized");
        return true;
      }
    }

    /**
     * If no user was found, return false.
     * @type {boolean}
     */
    $loggerKit.getLogger().debugconsole.log("[ConfiguratorKit] User not authorized");
    return false;
  }
}

const $configuratorKit = new ConfiguratorKit();

module.exports = { $configuratorKit };
