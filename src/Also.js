const _ = require("lodash");
const { logger } = require("./Logger");
const axios = require("axios");
const { $loggerKit } = require("../kits/LoggerKit");

/**
 * Executes a function based on the provided name and properties.
 * @param {string} name The name of the function to execute.
 * @param {Object} props The properties to pass to the function.
 * @returns {Promise<any>} The result of the executed function or null if the function does not exist.
 */
async function alsoMakeFunction(name, props) {
  const collection = {
    /**
     * Logs the provided properties using the logger kit.
     * @param {Object} props The properties to log.
     */
    log(props) {
      $loggerKit.getLogger().debug(props);
    },
    /**
     * Sends an axios request with the provided properties and logs the request.
     * @param {Object} props The axios request properties.
     * @returns {Promise} The axios request promise.
     */
    axios(props) {
      $loggerKit
        .getLogger()
        .debug(`axios sent request on '${props.url}' endpoint`);
      return axios(props);
    },
  };

  try {
    if (_.get(collection, name, undefined)) {
      return await _.get(collection, name)(props);
    } else {
      return null;
    }
  } catch (e) {
    logger.error(String(e));
  }
}

module.exports = { alsoMakeFunction };
