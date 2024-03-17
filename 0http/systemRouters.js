const {Http} = require("../src/Http");
const {Router} = require("../src/Router");
const _ = require("lodash");

module.exports = (router) => {
  router.get(
    "/system/routers",
    Http.basicAuthMiddleware("admins"),
    async (req, res, next) => {
      const type = _.get(req, 'query.type', 'plain')

      switch (type) {
        case "nested":
          return Http
            .of(req, res)
            .sendJsonObject(
              Http.positive(Router.getAllRoutersAsNestedFolders())
            )

        case "folders":
          return Http
            .of(req, res)
            .sendJsonObject(
              Http.positive(Router.getAllFolders())
            )

        case "contents":
          return Http
            .of(req, res)
            .sendJsonObject(
              Http.positive(Router.getAllExistsRoutesContents())
            )

        default:
          return Http
            .of(req, res)
            .sendJsonObject(
              Http.positive(Router.getAllExistsRoutes())
            )
      }
    }
  )
}