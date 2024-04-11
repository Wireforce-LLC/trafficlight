const _ = require("lodash");
const { logger } = require("../src/Logger");
const { $routerKit } = require("./RouterKit");
const { $loggerKit } = require("./LoggerKit");
const { Filter } = require("../src/Filter");
const { camelCase } = require("lodash");
const fs = require("node:fs");
const { Http } = require("../src/Http");
const axios = require("axios");

class MilkyWayKit {
  processingHttpJson(out, { req, res }) {
    const fileNameUri = String(_.get(out, "data.file", null));
    const rawObject = _.get(out, "data.raw", null);

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
      return Http.of(req, res).statusCode(200).sendJsonObject(rawObject);
    } else {
      return Http.of(req, res)
        .statusCode(500)
        .sendJsonObject(Http.negative("Resource dangered"));
    }
  }

  processingHttpHtml(out, { req, res }) {
    const fileNameUri = String(_.get(out, "data.file", null));
    const rawObject = _.get(out, "data.raw", null);
    const filename = Filter.formatString(fileNameUri);

    if (fs.existsSync(filename) && !rawObject) {
      return Http.of(req, res).sendHtml(String(fs.readFileSync(filename)));
    } else {
      return Http.of(req, res).sendHtml(rawObject);
    }
  }

  processingHttpRedirect(out, { req, res }) {
    const rawObject = _.get(out, "data.raw", null);

    return Http.of(req, res).redirect(rawObject);
  }

  processingHttpProxypass(out, { req, res }) {
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

  async resolveRouter(routerName, { req, res }) {
    const routerObject = $routerKit.getRouterContent(routerName);
    const defaultReturnSegment = { if: undefined, out: undefined };

    if (!_.isObject(routerObject)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router '${routerName}' is not working correctly. Router content is invalid`,
        );
      return null;
    }

    let if_ = _.get(routerObject, "if", undefined);
    let then_ = _.get(routerObject, "then", undefined);
    let else_ = _.get(routerObject, "else", undefined);
    let meta_ = _.get(routerObject, "meta", undefined);

    let filters_ = _.get(if_, "filters", []);

    if (_.isBoolean(if_)) {
      $loggerKit
        .getLogger()
        .debug(`Router '${routerName}' used '() => ${if_}' as 'if' segment`);
      if_ = () => if_;
    }

    if (_.isNull(else_) || _.isUndefined(else_)) {
      $loggerKit
        .getLogger()
        .debug(`Router '${routerName}' used '{} as 'else' segment`);
      else_ = {};
    }

    if (!_.isObject(if_) && !_.isFunction(if_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router ${routerName} is not working correctly. There is no 'if' field or it is invalid`,
        );
      return null;
    }

    if (!_.isObject(then_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router ${routerName} is not working correctly. There is no 'then' field or it is invalid`,
        );
      return null;
    }

    if (!_.isObject(else_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router ${routerName} is not working correctly. There is no 'else' field or it is invalid`,
        );
      return null;
    }

    if (!_.isArray(filters_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router ${routerName} is not working correctly. Filters are specified incorrectly.`,
        );
      return null;
    }

    if (_.isArray(filters_)) {
      $loggerKit.getLogger().warn("filters is a deprecated");
    }

    let booleanCollections = [];

    if (_.isArray(_.get(if_, "tools", []))) {
      for (const tool of _.get(if_, "tools", [])) {
        const toolData = _.flatten(_.toPairs(tool));
        const args = Filter.maskObject(toolData[1], {
          ..._.mapKeys(
            _.get(req, "query", {}),
            (_, i) => "$get." + camelCase(i),
          ),
        });

        const result = await Filter.useTool(
          {
            name: toolData[0],
            args,
          },
          req,
          res,
        );

        booleanCollections.push(result);
      }
    }

    $loggerKit
      .getLogger()
      .warn(`Router '${routerName}' has [${booleanCollections}]`);

    if (
      !_.includes(booleanCollections, false) &&
      !_.includes(booleanCollections, undefined)
    ) {
      return { if: true, out: then_, meta: meta_ };
    } else {
      return { if: false, out: else_, meta: meta_ };
    }
  }
}

const $milkyWayKit = new MilkyWayKit();

module.exports = { $milkyWayKit };
