const mime = require("node-mime-types");
const fs = require("node:fs");
const YAML = require("yaml");
const _ = require("lodash");
const path0 = require("node:path");

/**
 * A class to handle router configurations.
 */
class RouterKit {
  /**
   * Gets the content of a router configuration file.
   * @param {string} name The name of the router.
   * @returns {object|null} The parsed YAML content or null if not found or invalid.
   */
  getRouterContent(name) {
    const path = `${process.cwd()}/router/${name}.yml`;

    if (!this.isRouterExists(name)) {
      return null;
    }

    if (mime.getMIMEType(path) !== "text/yaml") {
      return null;
    }

    const data = String(fs.readFileSync(path));

    return YAML.parse(data);
  }

  /**
   * Checks if a router configuration file exists.
   * @param {string} name The name of the router.
   * @returns {boolean} True if the router exists, false otherwise.
   */
  isRouterExists(name) {
    return fs.existsSync(`${process.cwd()}/router/${name}.yml`);
  }

  /**
   * Gets all existing router names.
   * @returns {string[]|null} An array of router names or null if the router directory doesn't exist.
   */
  getAllExistsRoutes() {
    const path = process.cwd() + "/router";

    if (!fs.existsSync(path)) {
      return null;
    }

    return _.uniq(
      fs.readdirSync(path).map((i) => {
        if (mime.getMIMEType(i) === "text/yaml") {
          return path0
            .basename(i)
            .replace(path0.extname(path0.basename(i)), "");
        }

        return null;
      }),
    ).filter((i) => _.isString(i));
  }

  /**
   * Gets the contents of all existing router configurations.
   * @returns {object[]} An array of router configuration objects.
   */
  getAllExistsRoutesContents() {
    return this.getAllExistsRoutes().map((router) => {
      const raw = this.getRouterContent(router);

      return _.assign(
        {
          ...raw,
        },
        {
          meta: {
            ...raw.meta,
            name: router,
          },
        },
      );
    });
  }

  /**
   * Gets all unique folder names from the router configurations.
   * @returns {string[]} An array of folder names.
   */
  getAllFolders() {
    return _.filter(
      _.uniq(
        this.getAllExistsRoutesContents().map((router) =>
          _.get(router, "meta.group"),
        ),
      ),
      _.isString,
    );
  }

  /**
   * Groups all router configurations by their folder names.
   * @returns {object} An object with folder names as keys and arrays of router configurations as values.
   */
  getAllRoutersAsNestedFolders() {
    const routers = this.getAllExistsRoutesContents();

    return _.groupBy(routers, "meta.group");
  }
}

const $routerKit = new RouterKit();

module.exports = { $routerKit };
