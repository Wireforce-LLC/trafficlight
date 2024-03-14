const {Http} = require("../src/Http");
const {Router} = require("../src/Router");

module.exports = (router) => {
  router.get(
    "/system/routers",
    Http.basicAuthMiddleware("admins"),
    async (req, res, next) => {

      Http
        .of(req, res)
        .sendJsonObject(
          Http.positive(Router.getAllExistsRoutes())
        )
    }
  )
}