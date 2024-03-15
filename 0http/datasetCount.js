const {Http} = require("../src/Http");
const _ = require("lodash");
const {logger} = require("../src/Logger");
const zeroBasic = require("basic-auth-parser");
const {$databaseKit} = require("../kits/DatabaseKit");

module.exports = (router) => {
  router.post(
    "/dataset/count",
    Http.basicAuthMiddleware("admins"),
    async (req, res, next) => {
      const query = _.get(req, 'query', undefined)

      logger.debug(`User '${zeroBasic(req.headers.authorization).username}' picked traffic information`, {path: '/dataset/count'})

      const count = await $databaseKit.countHttpRequest(
        req.body,
        {
          startTime: query.startTime,
          endTime: query.endTime
        }
      )

      Http
        .of(req, res)
        .sendJsonObject(
          Http.positive({
            count
          })
        )
    }
  )
}