const _ = require("lodash");
const { IPDetect } = require("../src/Filter");
const UAParser = require("ua-parser-js");
const { $databaseKit } = require("./DatabaseKit");
const sha1 = require("sha1");
const { $configuratorKit } = require("./ConfiguratorKit");

class RouterMetricKit {
  dumpHttpRequest({ req }, _if = undefined, meta = undefined) {
    const remoteIp =
      req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];
    const remoteClientInfo = _.isString(remoteIp)
      ? IPDetect.get(remoteIp)
      : undefined;

    let mobileTrackingBaseGroup;
    let userAgent;

    const httpQuery = _.get(req, "query", undefined);

    if (!_.isEmpty(req.headers["user-agent"])) {
      const parser = new UAParser(req.headers["user-agent"]); // you need to pass the user-agent for nodejs
      userAgent = parser.getResult();
    }

    if ($configuratorKit.get("monitoring.useMobileTrackingBaseGroup", false)) {
      mobileTrackingBaseGroup = _.pick(httpQuery, [
        "_device",
        "_model",
        "_deviceHash",
        "_time",
      ]);
    }

    const request = {
      clientId: sha1(remoteIp + req.headers["user-agent"]),
      clickAt: new Date(),

      routerMeta: _.pickBy(meta || {}, _.identity),

      http: _.pickBy(
        {
          httpPath: _.get(req, "path", undefined),
          httpQuery: httpQuery,
          httpMethod: req.method,
          httpHeaders: req.headers,
          httpBody: req.body,
        },
        _.identity,
      ),

      ua: userAgent,
      remoteClientInfo,
      mobileTrackingBaseGroup,
      _if,
    };

    const clearRequest = _.pickBy(request, _.identity);

    return $databaseKit.pushHttpRequest(clearRequest);
  }
}

const $routerMetricKit = new RouterMetricKit();

module.exports = { $routerMetricKit };
