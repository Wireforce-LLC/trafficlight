const {Http} = require("../src/Http");
const _ = require("lodash");
const {logger} = require("../src/Logger");
const zeroBasic = require("basic-auth-parser");
const {Mongo} = require("../src/Mongo");
const {Router} = require("../src/Router");

module.exports = (router) => {
  router.get(
    "/ping",
    Http.basicAuthMiddleware("admins"),
    async (req, res, next) => {

      Http
        .of(req, res)
        .sendJsonObject(
          Http.positive('pong')
        )
    }
  )
}