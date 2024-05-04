const { Router } = require("./src/Router");
const { $configurator } = require("./src/config");
const { json, urlencoded } = require("express");

const routerDatasetManipulation = require("./0http/datasetManipulations");
const routerSystem = require("./0http/system");

const { $serviceKit } = require("./kits/ServiceKit");
const { $databaseKit } = require("./kits/DatabaseKit");
const { $loggerKit } = require("./kits/LoggerKit");

const _ = require("lodash");
const moment = require("moment");
const zero = require("0http");
const sequential = require("0http/lib/router/sequential");

const { $configuratorKit } = require("./kits/ConfiguratorKit");
const { $milkyWayKit } = require("./kits/MilkyWayKit");
const { Http } = require("./src/Http");
const { $routerMetricKit } = require("./kits/RouterMetricKit");
const { alsoMakeFunction } = require("./src/Also");
const { Filter } = require("./src/Filter");
const { $alsoLineKit } = require("./kits/AlsoLineKit");
const { camelCase } = require("lodash");

let router;
let server;

if ($configuratorKit.get("http.engine") === "0http") {
  const sequential = require("0http/lib/router/sequential");
  const zero = require("0http");

  const unpackZero = zero({
    router: sequential({
      cacheSize: 2000,
    }),
  });

  router = unpackZero.router;
  server = unpackZero.server;
} else if ($configuratorKit.get("http.engine") === "express") {
  const express = require("express");
  const { createServer } = require("http");

  router = express();
  server = createServer();
}

const host = $configurator.get("http.host", "0.0.0.0");
const port = $configurator.get("http.port", "3000");
const protocol = $configurator.get("http.protocol", "tcp");

router.use(urlencoded());
router.use(json());
router.use((req, _, next) => {
  $loggerKit.getLogger().debug(`${req.method} ${req.url}`)
  next()
});

routerDatasetManipulation(router);
routerSystem(router);


const mainRouterDynamic = (req, res) => {
  const route = _.get(req, "params.route", undefined)?.toLowerCase();

  if (!_.isString(route)) {
    return Http.of(req, res)
      .statusCode(500)
      .sendJsonObject(
        Http.negative(
          "The router is not connected correctly. :route parameter is missing",
        ),
      );
  }

  $milkyWayKit.resolveRouter(route, { req, res }).then((resolved) => {
    if (resolved) {
      const routerType = String(resolved.out.type).toUpperCase();
      const alsoDoIt = _.get(resolved.out, "also", []);

      if ($configuratorKit.get("monitoring.registerTraffic", false)) {
        $routerMetricKit.dumpHttpRequest({ req }, resolved.if, resolved.meta);
      }

      if (!_.isEmpty(alsoDoIt)) {
        alsoDoIt.map((also) => {
          const name = _.get(also, "name", undefined);
          const props = Filter.maskObject(_.get(also, "props", {}), {
            ..._.mapKeys(req.query, (_, i) => "$get." + camelCase(i)),
            ..._.mapKeys(req.body, (_, i) => "$body." + camelCase(i)),
            ..._.mapKeys(req, (_, i) => "$req." + camelCase(i)),
          });

          if (!_.isEmpty(name)) {
            $alsoLineKit.execute(name, props);
          }
        });
      }

      if (_.isEmpty(resolved.out)) {
        return Http.of(req, res).statusCode(200).end();
      }

      if (routerType === "JSON") {
        $milkyWayKit.processingHttpJson(resolved.out, { req, res });
      } else if (routerType === "HTML") {
        $milkyWayKit.processingHttpHtml(resolved.out, { req, res });
      } else if (routerType === "REDIRECT") {
        $milkyWayKit.processingHttpRedirect(resolved.out, { req, res });
      } else if (routerType === "PROXYPASS") {
        $milkyWayKit.processingHttpProxypass(resolved.out, { req, res });
      }
    } else {
      return Http.of(req, res)
        .statusCode(500)
        .sendJsonObject(
          Http.negative("The router is not connected correctly."),
        );
    }
  });
};

/**
 * Handles dynamic routing based on the route parameter.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get("/router/:route", mainRouterDynamic);

/**
 * Handles dynamic routing based on the router and route parameters.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
router.get("/:router/:route", mainRouterDynamic);

if ($configurator.get("http.loggerEnabled")) {
  /**
   * Logs each HTTP request if logging is enabled in the configuration.
   * @param {Object} req - The HTTP request object.
   * @param {Object} res - The HTTP response object.
   */
  server.on("request", function(req, res) {
    $loggerKit.getLogger().debug({ req, res });
  });
}

$loggerKit.getLogger().info(`Starting background services`);

$serviceKit.createIntervalService(
  "jobCleanerNoIndex",
  () => {
    /**
     * Finds and removes HTTP requests that have a 'noindex' flag within 'routerMeta'.
     * Logs the result to the console.
     */
    $databaseKit
      .findAndRemoveHttpRequests(
        {
          "routerMeta.noindex": true,
        },
        {
          startTime: moment(new Date(1999, 1, 1)).toISOString(),
          endTime: moment(new Date(2999, 1, 1)).toISOString(),
        },
      )
      .then(console.log);

    /**
     * Finds and removes HTTP requests that have a 'noindex' flag within 'meta'.
     * Logs the result to the console.
     */
    $databaseKit
      .findAndRemoveHttpRequests(
        {
          "meta.noindex": true,
        },
        {
          startTime: moment(new Date(1999, 1, 1)).toISOString(),
          endTime: moment(new Date(2999, 1, 1)).toISOString(),
        },
      )
      .then(console.log);
  },
  86400 * 1000,
);

/**
 * This service is designed to periodically clean up traffic records marked with a 'noindex' flag.
 * It targets both 'routerMeta.noindex' and 'meta.noindex' within the stored HTTP requests,
 * ensuring that no indexed records are purged from the system on a daily basis.
 */
$serviceKit.spawnService("jobCleanerNoIndex");

/**
 * Starts the server listening on the specified port and host.
 * Logs the server's readiness and its address upon successful launch.
 */
server.listen(parseInt(port), String(host), function() {
  $loggerKit
    .getLogger()
    .info("The TrafficLight is ready to route your traffic");

  $loggerKit
    .getLogger()
    .info(
      `Hosted on ${protocol}://${host}:${port} (click on it: http://${host}:${port})`,
    );
});