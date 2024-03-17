const {Http} = require("../src/Http");
const {Router} = require("../src/Router");

/**
 * @deprecated
 * @param router
 */
module.exports = (router) => {
  router.get(
    "/system/routers/folders",
    Http.basicAuthMiddleware("admins"),
    async (req, res) => {

      Http
        .of(req, res)
        .sendJsonObject(
          Http.positive(Router.getAllFolders())
        )
    }
  )
}