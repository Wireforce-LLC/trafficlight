const _ = require("lodash");
const axios = require("axios");
const fs = require("node:fs");
const mime = require("node-mime-types");
const path0 = require("node:path");
const sha1 = require("sha1");
const UAParser = require("ua-parser-js");
const YAML = require("yaml");
const { camelCase } = require("lodash");
const { Filter, IPDetect } = require("./Filter");
const { Http } = require("./Http");
const { $configuratorKit } = require("../kits/ConfiguratorKit");
const { logger } = require("./Logger");
const { alsoMakeFunction } = require("./Also");
const { $databaseKit } = require("../kits/DatabaseKit");

class Router {
  /**
   * Handles zeroHttp requests.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  static async zeroHttp(req, res) {
    if (typeof _.get(req, "params.route", undefined) !== "string") {
      return json({ req, res }, {
        statusCode: 500,
        data: "The router is not connected correctly. :route parameter is missing"
      })

      return Http.of(req, res)
        .statusCode(500)
        .sendJsonObject(
          Http.negative(
            "The router is not connected correctly. :route parameter is missing",
          ),
        );
    }

    const routeName = String(
      _.get(req, "params.route", undefined),
    ).toLowerCase();

    if (!Router.isRouterExists(routeName)) {
      return Http.of(req, res)
        .statusCode(500)
        .sendJsonObject(Http.negative("Router not found"));
    }

    const {
      if: _if,
      out: make,
      meta,
    } = await Router.make(Router.useRouter(routeName), routeName, { req, res });

    if (_if === undefined) {
      return Http.of(req, res)
        .statusCode(500)
        .sendJsonObject(
          Http.negative(
            "None of the filters returned the correct answer. if = undefined",
          ),
        );
    }

    if (_.get(configFile, "monitoring.registerTraffic", false)) {
      const remoteIp =
        req.headers["cf-connecting-ip"] || req.headers["x-real-ip"];
      const remoteClientInfo = _.isString(remoteIp)
        ? IPDetect.get(remoteIp)
        : null;

      let mobileTrackingBaseGroup = null;

      const httpQuery = _.get(req, "query", {});

      const parser = new UAParser(req.headers["user-agent"]); // you need to pass the user-agent for nodejs

      if ($configuratorKit.get("monitoring.useMobileTrackingBaseGroup", false)) {
        mobileTrackingBaseGroup = _.pick(httpQuery, [
          "_device",
          "_model",
          "_deviceHash",
          "_time",
        ]);
      }

      $databaseKit.pushHttpRequest({
        clientId: sha1(remoteIp + req.headers["user-agent"]),
        clickAt: new Date(),
        query: httpQuery,
        path: _.get(req, "path", undefined),
        ua: parser.getResult(),
        remoteClientInfo,
        headers: req.headers,
        mobileTrackingBaseGroup,
        _if,
        meta,
      });
    }

    if (!_.isEmpty(_.get(make, "also", []))) {
      _.get(make, "also", []).map((also) => {
        const name = _.get(also, "name", undefined);
        const props = _.get(also, "props", undefined);

        if (!_.isEmpty(name)) {
          alsoMakeFunction(
            name,
            Filter.replaceValueInNestedObject(props, "_headers", req.headers),
          );
        }
      });
    }

    if (String(make.type) === "JSON") {
      const fileNameUri = String(_.get(make, "data.file", null));
      const rawObject = _.get(make, "data.raw", null);

      const filename = Filter.formatString(fileNameUri);

      if (fs.existsSync(filename) && !rawObject) {
        try {
          return Http.of(req, res)
            .statusCode(200)
            .sendJsonObject(JSON.parse(String(fs.readFileSync(filename))));
        } catch (e) {
          return Http.of(req, res)
            .statusCode(500)
            .sendJsonObject(Http.negative("JSON file dangered"));
        }
      } else if (rawObject && (!filename || !fs.existsSync(filename))) {
        const raw = Filter.replaceValueInNestedObject(
          rawObject,
          "$reqeust",
          _.pick(req, ["url", "method", "path", "query"]),
        );

        return Http.of(req, res).statusCode(200).sendJsonObject(raw);
      } else {
        return Http.of(req, res)
          .statusCode(500)
          .sendJsonObject(Http.negative("Resource dangered"));
      }
    } else if (String(make.type) === "HTML") {
      const fileNameUri = String(_.get(make, "data.file", null));
      const rawObject = _.get(make, "data.raw", null);
      const filename = Filter.formatString(fileNameUri);

      if (fs.existsSync(filename) && !rawObject) {
        return Http.of(req, res).sendHtml(String(fs.readFileSync(filename)));
      } else {
        return Http.of(req, res).sendHtml(rawObject);
      }
    } else if (String(make.type) === "REDIRECT") {
      const rawObject = _.get(make, "data.raw", null);

      return Http.of(req, res).redirect(rawObject);
    } else if (String(make.type) === "PROXYPASS") {
      const rawObject = _.get(make, "data.raw", null);

      axios
        .get(rawObject, {
          headers: {
            accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
            "cache-control": "max-age=0",
            "sec-ch-ua":
              '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "none",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        })
        .then((data) => {
          return Http.of(req, res).setHeaders(data.headers).sendHtml(data.data);
        });
    }
  }

  /**
   * Creates a router object based on the given parameters.
   * @param {object} object - The router object.
   * @param {string} name - The name of the router.
   * @param {object} http - The http object containing request and response.
   * @return {Promise<{if: boolean|undefined, out: object}|null>} The router creation result.
   */
  static async make(object, name, http) {
    const defaultReturnSegment = { if: undefined, out: undefined };

    if (!_.isObject(object)) {
      logger.debug(
        `Router ${name} is not working correctly. object is invalid`,
      );
      return defaultReturnSegment;
    }

    let results = [];

    const { req, res } = http;

    let if_ = _.get(object, "if", undefined);
    let then_ = _.get(object, "then", undefined);
    let else_ = _.get(object, "else", undefined);
    let meta_ = _.get(object, "meta", undefined);

    if (_.isBoolean(if_)) {
      if_ = () => if_;
    }

    if (_.isNull(else_) || _.isUndefined(else_)) {
      else_ = {};
    }

    if (!_.isObject(if_)) {
      logger.debug(
        `Router ${name} is not working correctly. There is no 'if' field or it is invalid`,
      );
      return defaultReturnSegment;
    }

    if (!_.isObject(then_)) {
      logger.debug(
        `Router ${name} is not working correctly. There is no 'then' field or it is invalid`,
      );
      return defaultReturnSegment;
    }

    if (!_.isObject(else_)) {
      logger.debug(
        `Router ${name} is not working correctly. There is no 'else' field or it is invalid`,
      );
      return defaultReturnSegment;
    }

    if (!_.isArray(_.get(if_, "filters", []))) {
      logger.debug(
        `Router ${name} is not working correctly. Filters are specified incorrectly.`,
      );
      return defaultReturnSegment;
    }

    for (const filter of _.get(if_, "filters", [])) {
      const result = await Filter.useFilter(filter, req, res);

      results.push(result);
    }

    for (const tool of _.get(if_, "tools", [])) {
      const toolData = _.flatten(_.toPairs(tool));
      const args = Filter.maskObject(toolData[1], {
        ..._.mapKeys(req.query, (_, i) => "$get." + camelCase(i)),
      });

      const result = await Filter.useTool(
        {
          name: toolData[0],
          args,
        },
        req,
        res,
      );

      results.push(result);
    }

    if (!_.includes(results, false) && !_.includes(results, undefined)) {
      return { if: true, out: then_, meta: meta_ };
    } else {
      return { if: false, out: else_, meta: meta_ };
    }
  }

  /**
   * Uses a router by its name.
   * @param {string} name - The name of the router.
   * @return {object|null} The router object if exists, otherwise null.
   */
  static useRouter(name) {
    const path = `${process.cwd()}/router/${name}.yml`;

    if (!Router.isRouterExists(name)) {
      return null;
    }

    if (mime.getMIMEType(path) !== "text/yaml") {
      return null;
    }

    const data = String(fs.readFileSync(path));

    return YAML.parse(data);
  }

  /**
   * Checks if a router exists by name.
   * @param {string} name - The name of the router.
   * @return {boolean} True if the router exists, otherwise false.
   */
  static isRouterExists(name) {
    return fs.existsSync(`${process.cwd()}/router/${name}.yml`);
  }

  /**
   * Gets all existing routes.
   * @return {string[]|null} An array of existing route names, or null if not found.
   */
  static getAllExistsRoutes() {
    const path = process.cwd() + "/router";

    if (!fs.existsSync(path)) {
      return null;
    }

    return _.uniq(
      fs.readdirSync(path).map((i) => {
        if (mime.getMIMEType(i) === "text/yaml") {
          return path0
            .basename(i)
            .replace(path0.extname(path0.basename(i)), "");
        }

        return null;
      }),
    ).filter((i) => _.isString(i));
  }

  /**
   * Gets the contents of all existing routes.
   * @return {object[]} An array of router objects with their metadata.
   */
  static getAllExistsRoutesContents() {
    return this.getAllExistsRoutes().map((router) => {
      const raw = this.useRouter(router);

      return _.assign(
        {
          ...raw,
        },
        {
          meta: {
            ...raw.meta,
            name: router,
          },
        },
      );
    });
  }

  /**
   * Gets all folders from existing routes.
   * @return {string[]} An array of folder names.
   */
  static getAllFolders() {
    return _.filter(
      _.uniq(
        this.getAllExistsRoutesContents().map((router) =>
          _.get(router, "meta.group"),
        ),
      ),
      _.isString,
    );
  }

  /**
   * Groups all routers by their folders.
   * @return {object} An object with routers grouped by folders.
   */
  static getAllRoutersAsNestedFolders() {
    const routers = this.getAllExistsRoutesContents();

    return _.groupBy(routers, "meta.group");
  }
}

module.exports = { Router };
