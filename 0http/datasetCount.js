const {Http} = require("../src/Http");
const _ = require("lodash");
const {logger} = require("../src/Logger");
const zeroBasic = require("basic-auth-parser");
const {Mongo} = require("../src/Mongo");

module.exports = (router) => {
  router.post(
    "/dataset/count",
    Http.basicAuthMiddleware("admins"),
    async (req, res, next) => {
      const query = _.get(req, 'query', undefined)

      const sort = _.get(query, 'sort', 'abc') === 'abc' ? 1 : -1
      const limit = _.parseInt(_.get(query, 'limit', '128'))

      logger.debug(`User '${zeroBasic(req.headers.authorization).username}' picked traffic information`)

      const count = await Mongo.countRequestAnalyticObject(
        req.body,
        query.startTime,
        query.endTime
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