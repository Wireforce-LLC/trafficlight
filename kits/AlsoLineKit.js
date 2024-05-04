const axios = require("axios");
const { $loggerKit } = require("./LoggerKit");
const _ = require("lodash");

class AlsoLineKit {
  collection = {
    /**
     * Logs the provided properties using the logger kit.
     * @param {Object} props The properties to log.
     * @throws {Error} If the 'props' parameter is null or undefined.
     */
    log(props) {
      if (props === null || props === undefined) {
        throw new Error("props must not be null or undefined");
      }

      // Log the provided properties using the logger kit.
      try {
        $loggerKit.getLogger().debug(props);
      } catch (e) {
        if (e instanceof TypeError) {
          throw new Error("cannot log props: " + e.message);
        } else {
          throw e;
        }
      }
    },

    /**
     * Sends an axios request with the provided properties and logs the request.
     * @param {Object} props The axios request properties.
     * @returns {Promise} The axios request promise.
     * @throws {Error} If the 'props' parameter is null or undefined.
     * @throws {Error} If the 'props.url' parameter is null or undefined.
     * @throws {Error} If there is a problem logging the url.
     */
    axios(props) {
      if (props === null || props === undefined) {
        throw new Error("props must not be null or undefined");
      }

      let url = null;
      try {
        url = props.url;
      } catch (e) {
        if (e instanceof TypeError) {
          throw new Error("cannot get props.url: " + e.message);
        } else {
          throw e;
        }
      }

      if (url === null || url === undefined) {
        throw new Error("url must not be null or undefined");
      }

      try {
        $loggerKit
          .getLogger()
          .debug(`axios sent request on '${url}' endpoint`);
      } catch (e) {
        if (e instanceof TypeError) {
          throw new Error("cannot log url: " + e.message);
        } else {
          throw e;
        }
      }

      return axios(props);
    },
  };

  /**
   * Executes an 'alsoDoIt' task by its name and properties.
   * @param {string} name The name of the task to execute.
   * @param {Object} props The properties to pass to the task.
   * @returns {Promise<any>} The result of the executed task or null if the task does not exist.
   * @throws {Error} If there is a problem executing the task.
   */
  async execute(name, props) {
    $loggerKit.getLogger().debug(`Called '${name}' 'alsoDoIt' task`);

    try {
      // Get the task by its name from the 'collection' object.
      const task = _.get(this.collection, name, undefined);

      // If the task exists, execute it with the provided properties and return its result.
      if (task) {
        return await task(props);
      } else {
        // Otherwise, return null.
        return null;
      }
    } catch (e) {
      // If there is an error, log it.
      $loggerKit.getLogger().error(String(e));
    }
  }

}

const $alsoLineKit = new AlsoLineKit();

module.exports = { $alsoLineKit };
