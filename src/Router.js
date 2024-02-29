const YAML = require('yaml')
const fs = require("node:fs");
const _ = require("lodash");
const {Filter, IPDetect} = require("./Filter");
const {logger} = require("./Logger");
const {Client} = require("./Client");
const {Http} = require("./Http");
const {configFile, $configurator} = require("./config");
const UAParser = require("ua-parser-js");
const sha1 = require("sha1");
const {Mongo} = require("./Mongo");

class Router {
	static async zeroHttp(req, res) {
		if (typeof _.get(req, 'params.route', undefined) !== 'string') {
			return Http
				.of(req, res)
				.statusCode(500)
				.sendJsonObject(
					Http.negative("The router is not connected correctly. :route parameter is missing")
				)
		}

		const routeName = String(_.get(req, 'params.route', undefined)).toLowerCase()

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

		if (_if === undefined) {
			return Http
				.of(req, res)
				.statusCode(500)
				.sendJsonObject(
					Http.negative("None of the filters returned the correct answer. if = undefined")
				)
		}

		if (_.get(configFile, 'monitoring.registerTraffic', false)) {
			const remoteIp = req.headers['cf-connecting-ip'] || _.get(req.headers, _.get(configFile, 'router.configurator.headersForward.ip', "x-real-ip"))
			const requestInfo = _.isString(remoteIp) ? IPDetect.get(remoteIp) : null

			let mobileTrackingBaseGroup = null

			const httpQuery = _.get(req, 'query', {})

			const parser = new UAParser(req.headers["user-agent"]); // you need to pass the user-agent for nodejs

			if ($configurator.get("monitoring.useMobileTrackingBaseGroup", false)) {
				mobileTrackingBaseGroup = _.pick(
					httpQuery,
					[
						'_device',
						'_model',
						'_deviceHash',
						'_time'
					]
				)
			}

			await Mongo.insertRequestAnalyticObject({
				clientId: sha1(remoteIp + req.headers["user-agent"]),
				clickAt: new Date(),
				query: httpQuery,
				path: _.get(req, 'path', undefined),
				ua: parser.getResult(),
				requestInfo,
				headers: req.headers,
				mobileTrackingBaseGroup,
				_if
			})
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

				const mergedRaw = _.merge(
					Filter.replaceValueInNestedObject(
						$configurator.get('router.configurator.masking.response'),
						'@none',
						null
					),
					raw
				)

				return Http
					.of(req, res)
					.statusCode(200)
					.sendJsonObject(mergedRaw)

			} else {
				return Http
					.of(req, res)
					.statusCode(500)
					.sendJsonObject(
						Http.negative("Resource dangered")
					)
			}
		}
	}
	/**
	 *
	 * @param object
	 * @param name
	 * @param http
	 * @return {Promise<{if: boolean|undefined, out: object}|null>}
	 */
	static async make(object, name, http) {
		const defaultReturnSegment = {if: undefined, out: undefined}

		if (!_.isObject(object)) {
			logger.debug(`Router ${name} is not working correctly. object is invalid`)
			return defaultReturnSegment
		}

		let results = []

		const {req, res} = http

		let if_ = _.get(object, 'if', undefined)
		let then_ = _.get(object, 'then', undefined)
		let else_ = _.get(object, 'else', undefined)

		if (_.isBoolean(if_)) {
			if_ = () => if_ === true
		}

		if (_.isNull(else_) || _.isUndefined(else_)) {
			else_ = {}
		}

		if (!_.isObject(if_)) {
			logger.debug(`Router ${name} is not working correctly. There is no 'if' field or it is invalid`)
			return defaultReturnSegment
		}

		if (!_.isObject(then_)) {
			logger.debug(`Router ${name} is not working correctly. There is no 'then' field or it is invalid`)
			return defaultReturnSegment
		}

		if (!_.isObject(else_)) {
			logger.debug(`Router ${name} is not working correctly. There is no 'else' field or it is invalid`)
			return defaultReturnSegment
		}

		if (!_.isArray(_.get(if_, 'filters', []))) {
			logger.debug(`Router ${name} is not working correctly. Filters are specified incorrectly.`)
			return defaultReturnSegment
		}

		for (const filter of _.get(if_, 'filters', [])) {
			const result = await Filter.useFilter(filter, req, res)

			results.push(result)
		}

		for (const tool of _.get(if_, 'tools', [])) {
			const toolData = _.flatten(_.toPairs(tool))

			const result = await Filter.useTool({name: toolData[0], args: toolData[1]}, req, res)

			results.push(result)
		}

		if (!_.includes(results, false) && !_.includes(results, undefined)) {
			return { if: true, out: then_ }
		} else {
			return { if: false, out: else_ }
		}
	}

	static useRouter(name) {
		if (!this.isRouterExists(name)) {
			return null
		}

		const data = String(fs.readFileSync(`${process.cwd()}/router/${name}.yml`))

		return YAML.parse(data)
	}

	static isRouterExists(name) {
		return fs.existsSync(`${process.cwd()}/router/${name}.yml`)
	}
}

module.exports = {Router}