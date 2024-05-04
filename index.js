const { json, urlencoded } = require("express");

const routerDatasetManipulation = require("./0http/datasetManipulations");
const routerSystem = require("./0http/system");
const routerDynamic = require("./0http/router");

const { $serviceKit } = require("./kits/ServiceKit");
const { $databaseKit } = require("./kits/DatabaseKit");
const { $loggerKit } = require("./kits/LoggerKit");

const _ = require("lodash");
const moment = require("moment");
const zero = require("0http");
const sequential = require("0http/lib/router/sequential");

const { $configuratorKit } = require("./kits/ConfiguratorKit");

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

const host = $configuratorKit.get("http.host", "0.0.0.0");
const port = $configuratorKit.get("http.port", 3000);
const protocol = $configuratorKit.get("http.protocol", "tcp");

router.use(urlencoded());
router.use(json());
router.use(function(req, res, next) {
  req.url = req.url.replace(/\/+/g, "/")
  req.path = req.path.replace(/\/+/g, "/")
  req.originalUrl = req.originalUrl.replace(/\/+/g, "/")

  return next();
});

router.use((req, _, next) => {
  $loggerKit.getLogger().debug(`${req.method} ${req.url}`)
  return next()
});

routerDatasetManipulation(router);
routerSystem(router);
routerDynamic(router);

// router.use("/", function (req, res) {
//   return json({ req, res }, {
//     statusCode: 404,
//     data: "Not found"
//   })
// });


if ($configuratorKit.get("http.loggerEnabled")) {
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
