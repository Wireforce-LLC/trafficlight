const _ = require("lodash");
const { readFileSync } = require("fs");
const path = require("node:path");
const mmdb = require("mmdb-lib");
const { $configurator } = require("./config");

// Get a buffer with mmdb database, from file system or whereever.
const db = readFileSync(path.normalize(`${process.cwd()}/country_asn.mmdb`));

const reader = new mmdb.Reader(db);

/**
 * Tools for various operations like IP checks and equality checks.
 */
const TOOLS = {
  /**
   * Checks if the request IP is allowed based on country.
   * @param {Object} args - The arguments, including country to check.
   * @param {Object} context - The request and response objects.
   * @returns {boolean} - Whether the IP is allowed.
   */
  IP(args, { req, res }) {
    const remoteIp =
      req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];

    const allowIfThereInsufficientIP = $configurator.get(
      "monitoring.allowIfThereInsufficientIP",
      false,
    );

    if (!remoteIp && allowIfThereInsufficientIP) {
      return true;
    } else if (!remoteIp && !allowIfThereInsufficientIP) {
      return false;
    }

    const results = [];
    const requestInfo = reader.get(remoteIp);

    if (requestInfo == null) {
      return false;
    }

    if (args.country) {
      if (_.isString(args.country)) {
        results.push(requestInfo.country === args.country);
      } else if (_.isArray(args.country)) {
        results.push(args.country.includes(requestInfo.country));
      } else {
        results.push(false);
      }
    }

    return results.includes(false) === false;
  },

  /**
   * Checks if the request comes from an Apple IP.
   * @param {Object} args - The arguments.
   * @param {Object} context - The request and response objects.
   * @returns {boolean|undefined} - True if Apple IP, undefined otherwise.
   */
  BOTS_APPLE_IP(args, { req, res }) {
    const remoteIp =
      req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];

    if (!_.isString(remoteIp)) {
      return undefined;
    }

    const requestInfo = reader.get(remoteIp);

    if (requestInfo == null) {
      return undefined;
    }

    return (
      String(_.get(requestInfo, "as_domain", "false")).toLowerCase() ===
      "apple.com"
    );
  },

  /**
   * Checks if the request does not come from an Apple IP.
   * @param {Object} args - The arguments.
   * @param {Object} context - The request and response objects.
   * @returns {boolean|undefined} - False if Apple IP, undefined otherwise.
   */
  NOT_BOTS_APPLE_IP(args, { req, res }) {
    const remoteIp =
      req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];

    if (!_.isString(remoteIp)) {
      return undefined;
    }

    const requestInfo = reader.get(remoteIp);

    if (requestInfo == null) {
      return undefined;
    }

    return (
      String(_.get(requestInfo, "as_domain", "false")).toLowerCase() !==
      "apple.com"
    );
  },

  /**
   * Checks if two values are equal.
   * @param {Object} args - The values to compare.
   * @returns {boolean} - True if equal, false otherwise.
   */
  EQ(args) {
    const value1 = _.get(args, "value1");
    const value2 = _.get(args, "value2");

    return value1 === value2;
  },

  /**
   * Checks if two values are not equal.
   * @param {Object} args - The values to compare.
   * @returns {boolean} - True if not equal, false otherwise.
   */
  NOT_EQ(args) {
    const value1 = _.get(args, "value1");
    const value2 = _.get(args, "value2");

    return value1 !== value2;
  },
};

/**
 * Basic filters for processing requests.
 */
const BASIC_FILTERS = {
  /**
   * Checks if the request comes from an Apple IP.
   * @param {Object} context - The request and response objects.
   * @returns {boolean|undefined} - True if Apple IP, undefined otherwise.
   */
  APPLE_IP: async ({ req, res }) => {
    const remoteIp =
      req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];

    if (
      !remoteIp &&
      _.get(config, "policy.allowIfThereInsufficientIP", false)
    ) {
      return true;
    } else if (
      !remoteIp &&
      !_.get(config, "policy.allowIfThereInsufficientIP", false)
    ) {
      return false;
    }

    const requestInfo = reader.get(remoteIp);

    if (requestInfo == null) {
      return undefined;
    }

    return (
      String(_.get(requestInfo, "as_domain", "false")).toLowerCase() ===
      "apple.com"
    );
  },
};

/**
 * Filter class for applying various filters.
 */
class Filter {
  /**
   * Filters available for use.
   */
  static FILTERS = {
    ...BASIC_FILTERS,
    /**
     * Negation of the APPLE_IP filter.
     * @param {Object} obj - The request and response objects.
     * @returns {Promise<boolean>} - The negated result of APPLE_IP filter.
     */
    NOT_APPLE_IP: async (obj) => !(await BASIC_FILTERS.APPLE_IP(obj)),
  };

  /**
   * Formats a string by replacing placeholders with the current working directory.
   * @param {string} string - The string to format.
   * @returns {string} - The formatted string.
   */
  static formatString(string) {
    return String(string)
      .replaceAll("$PWD", process.cwd())
      .replaceAll("$CWD", process.cwd())
      .replaceAll("$ROOT", process.cwd());
  }

  /**
   * Replaces values in a nested object.
   * @param {Object|Array} obj - The object or array to process.
   * @param {string} thisName - The placeholder name to replace.
   * @param {*} replacement - The replacement value.
   * @returns {Object|Array} - The processed object or array.
   */
  static replaceValueInNestedObject(obj, thisName = "$this", replacement) {
    if (typeof obj === "object" && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          obj[index] = this.replaceValueInNestedObject(
            item,
            thisName,
            replacement,
          );
        });
      } else {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            obj[key] = this.replaceValueInNestedObject(
              obj[key],
              thisName,
              replacement,
            );
          }
        }
      }
    } else if (obj === thisName) {
      return replacement;
    }
    return obj;
  }

  /**
   * Masks an object with another object.
   * @param {Object} target - The target object to mask.
   * @param {Object} mask - The mask object.
   * @returns {Object} - The masked object.
   */
  static maskObject(target, mask) {
    let _target = target;
    _.toPairs(mask).map((pair) => {
      if (!pair[0].startsWith("$")) {
        throw Error("All mask keys must begin with the $ symbol");
      }

      _target = Filter.replaceValueInNestedObject(_target, pair[0], pair[1]);
    });

    return _target;
  }

  /**
   * Applies a named filter to a request.
   * @param {string} name - The filter name.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<*>} - The result of the filter.
   */
  static async useFilter(name, req, res) {
    return await _.get(this.FILTERS, name, () => undefined)({ req, res });
  }

  /**
   * Applies a named tool to a request.
   * @param {Object} tool - The tool object, including name and args.
   * @param {Object} req - The request object.
   * @param {Object} res - The response object.
   * @returns {Promise<*>} - The result of the tool.
   */
  static async useTool({ name, args }, req, res) {
    return _.get(TOOLS, name, (args, { req, res }) => undefined).call(
      null,
      args,
      { req, res },
    );
  }
}

module.exports = { Filter, IPDetect: reader };
