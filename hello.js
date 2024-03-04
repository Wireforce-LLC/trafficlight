const zero = require('0http')
const zeroBasic = require("basic-auth-parser")
const zeroBodyParser = require('body-parser')

const {Router} = require("./src/Router");
const {$configurator} = require("./src/config");
const {logger} = require("./src/Logger");
const {Http} = require("./src/Http");
const _ = require("lodash");
const {Mongo} = require("./src/Mongo");
const sequential = require('0http/lib/router/sequential')
const {json, urlencoded} = require("express");
const routerDatasetSelect = require('./0http/datasetSelect')
const routerDatasetCount = require('./0http/datasetCount')
const routerSystemRouters = require('./0http/systemRouters')
const routerRouterRaw = require('./0http/routerRaw')

const { router, server } = zero({
	router: sequential({
		cacheSize: 2000
	})
})

const host = $configurator.get('http.host', '0.0.0.0')
const port = $configurator.get('http.port', '3000')
const protocol = $configurator.get('http.protocol', 'tcp')

router.use(urlencoded())
router.use(json())

routerDatasetSelect(router)
routerDatasetCount(router)
routerSystemRouters(router)
routerRouterRaw(router)

router.get('/router/:route', Router.zeroHttp)
router.get('/:router/:route', Router.zeroHttp)

// router.get('/api/:version/:router/:route', Router.zeroHttp)


if ($configurator.get("http.loggerEnabled")) {
	server.on("request", function (req) {
		logger.debug(req)
	})
}


server.listen(
	parseInt(port),
	String(host),
	function () {
		logger.info("The TrafficLight is ready to route your traffic")
		logger.info(`Hosted on ${protocol}://${host}:${port} (click on it: http://${host}:${port})`)
	}
)
