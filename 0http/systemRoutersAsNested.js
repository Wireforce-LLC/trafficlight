const {Http} = require("../src/Http");
const {Router} = require("../src/Router");

module.exports = (router) => {
  router.get(
    "/system/routers/nested",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {

      Http
        .of(req, res)
        .sendJsonObject(
          Http.positive(Router.getAllRoutersAsNestedFolders())
        )
    }
  )
}