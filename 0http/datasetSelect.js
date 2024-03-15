const {Http} = require("../src/Http");
const _ = require("lodash");
const {logger} = require("../src/Logger");
const zeroBasic = require("basic-auth-parser");
const {$databaseKit} = require("../kits/DatabaseKit");
const {$loggerKit} = require("../kits/LoggerKit");

module.exports = (router) => {
  router.post(
    "/dataset/select",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {
      const query = _.get(req, 'query', undefined)

      const sort = _.get(query, 'sort', 'abc') === 'abc' ? 1 : -1
      const limit = _.parseInt(_.get(query, 'limit', '128'))

      $loggerKit.getLogger().debug(`User '${zeroBasic(req.headers.authorization).username}' picked traffic information`, {path: "/dataset/select"})

      const selected = await $databaseKit.findHttpRequests(
        req.body,
        {
          sort: parseInt(sort),
          limit: parseInt(limit),
          startTime: query.startTime,
          endTime: query.endTime
        }
      )

      Http
        .of(req, res)
        .sendJsonObject(
          Http.positive(selected)
        )
    }
  )
}