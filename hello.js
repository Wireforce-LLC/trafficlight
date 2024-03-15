const {Router} = require("./src/Router");
const {$configurator} = require("./src/config");
const {json, urlencoded} = require("express");

const routerDatasetSelect = require('./0http/datasetSelect')
const routerDatasetCount = require('./0http/datasetCount')
const routerSystemRouters = require('./0http/systemRouters')
const routerSystemRoutersFolders = require('./0http/systemRoutersFolders')
const routerSystemRoutersAsNested = require('./0http/systemRoutersAsNested')
const routerRouterRaw = require('./0http/routerRaw')
const routerPing = require('./0http/ping')

const {$serviceKit} = require("./kits/ServiceKit");
const {$databaseKit} = require("./kits/DatabaseKit");
const {$loggerKit} = require("./kits/LoggerKit");

const {$configuratorKit} = require("./kits/ConfiguratorKit");
const zero = require("0http");
const sequential = require("0http/lib/router/sequential");
const {$milkyWayKit} = require("./kits/MilkyWayKit");
const _ = require("lodash");
const {Http} = require("./src/Http");
const {$routerMetricKit} = require("./kits/RouterMetricKit");
const {alsoMakeFunction} = require("./src/Also");
const {Filter} = require("./src/Filter");
const {$alsoLineKit} = require("./kits/AlsoLineKit");
const {camelCase} = require("lodash");
const moment = require("moment");

let router
let server

if ($configuratorKit.get('http.engine') === '0http') {
	const sequential = require('0http/lib/router/sequential')
	const zero = require('0http')

	const unpackZero = zero({
		router: sequential({
			cacheSize: 2000
		})
	})

	router = unpackZero.router
	server = unpackZero.server
} else if ($configuratorKit.get('http.engine') === 'express') {
	const express = require('express')
	const { createServer } = require('http')

	router = express()
	server = createServer()
}

const host = $configurator.get('http.host', '0.0.0.0')
const port = $configurator.get('http.port', '3000')
const protocol = $configurator.get('http.protocol', 'tcp')

router.use(urlencoded())
router.use(json())

routerSystemRoutersAsNested(router)
routerSystemRoutersFolders(router)
routerSystemRouters(router)
routerDatasetSelect(router)
routerDatasetCount(router)
routerRouterRaw(router)
routerPing(router)

const mainRouterDynamic = (req, res) => {
	const route = _.get(req, 'params.route', undefined)?.toLowerCase()

	if (!_.isString(route)) {
		return Http
			.of(req, res)
			.statusCode(500)
			.sendJsonObject(
				Http.negative("The router is not connected correctly. :route parameter is missing")
			)
	}

	$milkyWayKit
		.resolveRouter(route, {req, res})
		.then(resolved => {
			if (resolved) {
				const routerType = String(resolved.out.type).toUpperCase()
				const alsoDoIt = _.get(resolved.out, 'also', [])

				if ($configuratorKit.get('monitoring.registerTraffic', false)) {
					$routerMetricKit.dumpHttpRequest({req}, resolved.if, resolved.meta)
				}

				if (!_.isEmpty(alsoDoIt)) {
					alsoDoIt.map(also => {
						const name = _.get(also, 'name', undefined)
						const props = Filter.maskObject(
							_.get(also, 'props', {}),
							{
								..._.mapKeys(req.query, (_, i) => "$get." + camelCase(i)),
								..._.mapKeys(req.body, (_, i) => "$body." + camelCase(i)),
								..._.mapKeys(req, (_, i) => "$req." + camelCase(i)),
							}
						)

						if (!_.isEmpty(name)) {
							$alsoLineKit.execute(name, props)
						}
					})
				}

				if (_.isEmpty(resolved.out)) {
					return Http
						.of(req, res)
						.statusCode(200)
						.end()
				}

				if (routerType === 'JSON') {
					$milkyWayKit.processingHttpJson(resolved.out, {req, res})
				} else if (routerType === 'HTML') {
					$milkyWayKit.processingHttpHtml(resolved.out, {req, res})
				} else if (routerType === 'REDIRECT') {
					$milkyWayKit.processingHttpRedirect(resolved.out, {req, res})
				} else if (routerType === 'PROXYPASS') {
					$milkyWayKit.processingHttpProxypass(resolved.out, {req, res})
				}
			} else {
				return Http
					.of(req, res)
					.statusCode(500)
					.sendJsonObject(
						Http.negative("The router is not connected correctly.")
					)
			}
		})
}

router.get('/router/:route', mainRouterDynamic)
router.get('/:router/:route', mainRouterDynamic)

if ($configurator.get("http.loggerEnabled")) {
	server.on("request", function (req) {
		$loggerKit.getLogger().debug(req)
	})
}

$loggerKit.getLogger().info(`Starting background services`)

$serviceKit.createIntervalService('jobCleanerNoIndex', () => {
	$databaseKit.findAndRemoveHttpRequests({
		'routerMeta.noindex': true
	}, {
		startTime: moment(new Date(1999, 1, 1)).toISOString(),
		endTime: moment(new Date(2999, 1, 1)).toISOString(),
	}).then(console.log)

	$databaseKit.findAndRemoveHttpRequests({
		'meta.noindex': true
	}, {
		startTime: moment(new Date(1999, 1, 1)).toISOString(),
		endTime: moment(new Date(2999, 1, 1)).toISOString(),
	}).then(console.log)
}, 86400)

$serviceKit.spawnService('jobCleanerNoIndex')

server.listen(
	parseInt(port),
	String(host),
	function () {
		$loggerKit.getLogger().info("The TrafficLight is ready to route your traffic")
		$loggerKit.getLogger().info(`Hosted on ${protocol}://${host}:${port} (click on it: http://${host}:${port})`)
	}
)
