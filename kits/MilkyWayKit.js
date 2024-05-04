const _ = require("lodash");
const { $routerKit } = require("./RouterKit");
const { $loggerKit } = require("./LoggerKit");
const { Filter } = require("../src/Filter");
const { camelCase } = require("lodash");
const fs = require("node:fs");
const { Http } = require("../src/Http");
const axios = require("axios");

const { json } = require("../src/NewHttp").response;
const middleware = require("../src/NewHttp").middleware;

class MilkyWayKit {
  async processingHttpJson(out, { req, res }) {
    const fileNameUri = _.get(out, "data.file", null);
    const rawObject = _.get(out, "data.raw", null);

    const filename = fileNameUri && Filter.formatString(fileNameUri);

    if (!filename) {
      $loggerKit.getLogger().error("File name is null");

      return json({ req, res }, {
        statusCode: 500,
        data: "File name is null",
      });
    }

    if (!fs.existsSync(filename)) {
      $loggerKit.getLogger().error(`File ${filename} not found`);

      return json({ req, res }, {
        statusCode: 500,
        data: `File ${filename} not found`,
      });
    }

    if (!rawObject) {
      $loggerKit.getLogger().error("Raw object is null");

      return json({ req, res }, {
        statusCode: 500,
        data: "Raw object is null",
      });
    }

    try {
      const object = JSON.parse(String(fs.readFileSync(filename)));

      return json({ req, res }, {
        statusCode: 200,
        data: object,
      });
    } catch (e) {
      $loggerKit.getLogger().error(e);

      return json({ req, res }, {
        statusCode: 500,
        data: "JSON file dangered",
      });
    }
  }

  async processingHttpHtml(out, { req, res }) {
    const fileNameUri = String(_.get(out, "data.file", null));
    const rawObject = _.get(out, "data.raw", null);
    const filename = Filter.formatString(fileNameUri);

    if (fs.existsSync(filename) && !rawObject) {
      return Http.of(req, res).sendHtml(String(fs.readFileSync(filename)));
    } else {
      return Http.of(req, res).sendHtml(rawObject);
    }
  }

  async processingHttpRedirect(out, { req, res }) {
    const rawObject = _.get(out, "data.raw", null);

    return Http.of(req, res).redirect(rawObject);
  }

  async processingHttpProxypass(out, { req, res }) {
    const rawObject = _.get(out, "data.raw", null);

    try {
      const { data } = await axios.get(rawObject, {
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
      });

      return Http.of(req, res).setHeaders(data.headers).sendHtml(data);
    } catch (e) {
      $loggerKit.getLogger().error(e);

      return json({ req, res }, {
        statusCode: 500,
        data: "Proxy server error",
      });
    }
  }

  async resolveRouter(routerName, { req, res }) {
    const routerObject = $routerKit.getRouterContent(routerName);

    if (!routerObject) {
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

    if (!else_) {
      else_ = {};
    }

    if (!_.isObject(if_) && !_.isFunction(if_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router '${routerName}' is not working correctly. There is no 'if' field or it is invalid`,
        );
      return null;
    }

    if (!_.isObject(then_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router '${routerName}' is not working correctly. There is no 'then' field or it is invalid`,
        );
      return null;
    }

    if (!_.isObject(else_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router '${routerName}' is not working correctly. There is no 'else' field or it is invalid`,
        );
      return null;
    }

    if (!_.isArray(filters_)) {
      $loggerKit
        .getLogger()
        .debug(
          `Router '${routerName}' is not working correctly. Filters are specified incorrectly.`,
        );
      return null;
    }

    if (_.isArray(_.get(if_, "tools", []))) {
      const tools = _.get(if_, "tools", []);

      try {
        const booleanCollections = await Promise.all(
          tools.map(async (tool) => {
            const toolData = _.flatten(_.toPairs(tool));
            const args = Filter.maskObject(toolData[1], {
              ..._.mapKeys(
                _.get(req, "query", {}),
                (_, i) => "$get." + camelCase(i),
              ),
            });

            return await Filter.useTool(
              {
                name: toolData[0],
                args,
              },
              req,
              res,
            );
          }),
        );

        $loggerKit
          .getLogger()
          .warn(`Router '${routerName}' has [${booleanCollections}]`);

        if (
          booleanCollections.every((b) => b === true) ||
          booleanCollections.every((b) => b === undefined)
        ) {
          return { if: true, out: then_, meta: meta_ };
        } else {
          return { if: false, out: else_, meta: meta_ };
        }
      } catch (e) {
        $loggerKit.getLogger().error(e);
        return null;
      }
    } else {
      return null;
    }
  }
}

const $milkyWayKit = new MilkyWayKit();

module.exports = { $milkyWayKit };
