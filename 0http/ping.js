const { Http } = require("../src/Http");

module.exports = (router) => {
  router.get(
    "/system/ping",
    Http.basicAuthMiddleware("admins"),
    async (req, res, next) => {
      Http.of(req, res).sendJsonObject(Http.positive("pong"));
    },
  );
};
