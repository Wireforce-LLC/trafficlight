const _ = require("lodash");
const {logger} = require("./Logger");
const axios = require("axios");
const {$loggerKit} = require("../kits/LoggerKit");

async function alsoMakeFunction(name, props) {
  const collection = {
    log(props) {
      $loggerKit.getLogger().debug(props)
    },
    axios(props) {
      $loggerKit.getLogger().debug(`axios sent request on '${props.url}' endpoint`)
      return axios(props)
    }
  }

  try {
    if (_.get(collection, name, undefined)) {
      return await _.get(collection, name)(props)
    } else {
      return null
    }
  } catch (e) {
    logger.error(String(e))
  }
}

module.exports = {alsoMakeFunction}