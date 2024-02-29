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

router.post(
	"/dataset/select",
	Http.basicAuthMiddleware("admins"),
	async (req, res, next) => {
		const query = _.get(req, 'query', undefined)

		const sort = _.get(query, 'sort', 'abc') === 'abc' ? 1 : -1
		const limit = _.parseInt(_.get(query, 'limit', '128'))

		logger.debug(`User '${zeroBasic(req.headers.authorization).username}' picked traffic information`)

		const selected = await Mongo.selectRequestAnalyticObject(
			sort,
			limit,
			req.body
		)

		Http
			.of(req, res)
			.sendJsonObject(
				Http.positive(selected)
			)
	}
)

router.get('/router/:route', Router.zeroHttp)
// router.get('/:router/:route', Router.zeroHttp)
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
