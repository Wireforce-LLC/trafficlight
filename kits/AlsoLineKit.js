const {logger} = require("../src/Logger");
const axios = require("axios");
const {$loggerKit} = require("./LoggerKit");
const _ = require("lodash");

class AlsoLineKit {
  collection = {
    log(props) {
      $loggerKit.getLogger().debug(props)
    },
    axios(props) {
      $loggerKit.getLogger().debug(`axios sent request on '${props.url}' endpoint`)
      return axios(props)
    }
  }

  async execute(name, props) {
    $loggerKit.getLogger().debug(`Called '${name}' 'alsoDoIt' task`)

    try {
      if (_.get(this.collection, name, undefined)) {
        return await _.get(this.collection, name)(props)
      } else {
        return null
      }
    } catch (e) {
      $loggerKit.getLogger().error(String(e))
    }
  }
}

const $alsoLineKit = new AlsoLineKit()

module.exports = { $alsoLineKit }