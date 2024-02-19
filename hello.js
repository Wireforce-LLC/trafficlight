const zero = require('0http')
const leveldown = require("leveldown");
const {Router} = require("./src/Router");
const _ = require("lodash");
const fs = require("node:fs");
const {Http} = require("./src/Http");
const {Filter, IPDetect} = require("./src/Filter");
const { MongoClient } = require('mongodb');
const {config} = require("./src/config");
const sha1 = require('sha1');
const UAParser = require("ua-parser-js")

leveldown(`${process.cwd()}/level`);

const { router, server } = zero()

// Connection URL
const url = 'mongodb://127.0.0.1:3201';
const client = new MongoClient(url);

// client.connect().then(console.log).catch(console.error)

router.get('/router/:route', async (req, res) => {
	if (typeof _.get(req, 'params.route', undefined) !== 'string') {
		return Http
			.of(req, res)
			.sendJsonObject(
				Http.positive("Hey")
			)
	}

	const routeName = String( _.get(req, 'params.route', undefined)).toLowerCase()

	if (!Router.isRouterExists(routeName)) {
		return Http
			.of(req, res)
			.statusCode(500)
			.sendJsonObject(
				Http.negative("Router not found")
			)
	}

	const { if: _if, out: make } = await Router.make(
		Router.useRouter(routeName),
		routeName,
		{ req, res }
	)

	if (_.get(config, 'monitoring.registerTraffic', false)) {
		const remoteIp = req.headers['cf-connecting-ip'] || _.get(req.headers, _.get(config, 'headersForward.ip', "x-real-ip"))
		const requestInfo = IPDetect.get(remoteIp)
		const parser = new UAParser(req.headers["user-agent"]); // you need to pass the user-agent for nodejs

		const requestAnalyticObject = {
			...req.headers,
			...requestInfo,
			clientId: sha1(remoteIp + req.headers["user-agent"]),
			clickAt: new Date(),
			query: _.get(req, 'query', {}),
			path: _.get(req, 'path', undefined),
			ua: parser.getResult(),
			_if
		}

		client
			.db("traffic")
			.collection('routers')
			.insertOne(requestAnalyticObject)
			.catch(console.error)
	}

	if (String(make.type) === 'JSON') {
		const fileNameUri = String(_.get(make, 'data.file', null))
		const rawObject = _.get(make, 'data.raw', null)

		const filename = Filter.formatString(fileNameUri)

		if (fs.existsSync(filename) && !rawObject) {
			try {
				return Http
					.of(req, res)
					.statusCode(200)
					.sendJsonObject(
						JSON.parse(String(fs.readFileSync(filename)))
					)
			} catch (e) {
				return Http
					.of(req, res)
					.statusCode(500)
					.sendJsonObject(
						Http.negative("JSON file dangered")
					)
			}
		} else if (rawObject && (!filename || !fs.existsSync(filename))) {
			const raw = Filter.replaceValueInNestedObject(rawObject, '@reqeust', _.pick(req, ['url', 'method', 'path', 'query']))

			return Http
				.of(req, res)
				.statusCode(200)
				.sendJsonObject(raw)
		} else {
			return Http
				.of(req, res)
				.statusCode(500)
				.sendJsonObject(
					Http.negative("Resource dangered")
				)
		}
	}
})

server.listen(3000)
