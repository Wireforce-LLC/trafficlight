const {Client} = require("./Client");
const {$configurator} = require("./config");
const _ = require("lodash");
const {BSON, EJSON} = require("bson");
const moment = require("moment");


class Mongo {
	static async insertRequestAnalyticObject(requestAnalyticObject) {
		return await Client
			.useClient()
			.db($configurator.getDbPath('db/traffic'))
			.collection($configurator.getDbPath('db/traffic/routers'))
			.insertOne(requestAnalyticObject)
	}

	/**
	 *
	 * @param {number} sort
	 * @param {number|128} limit
	 * @param selector
	 * @param startTime
	 * @param endTime
	 * @return {Promise<(Document & {_id: InferIdType<Document>})[]>}
	 */
	static async selectRequestAnalyticObject(
		sort,
		limit,
		selector,
		startTime = moment(new Date(1999, 1, 1)).toISOString(),
		endTime = moment(new Date(3000, 1, 1)).toISOString(),
	) {
		return Array.of(
			...await Client
				.useClient()
				.db($configurator.getDbPath('db/traffic'))
				.collection($configurator.getDbPath('db/traffic/routers'))
				.find({
					...selector,
					clickAt: {
						$gt: moment(Date.parse(startTime)).toDate(),
						$lte: moment(Date.parse(endTime)).toDate(),
					}
				})
				.sort({_id: sort === 1 ? 1 : -1})
				.limit(_.parseInt(limit || '128'))
				.toArray()
		)
	}

	static async countRequestAnalyticObject(
		selector = {},
		startTime = moment(new Date(1999, 1, 1)).toISOString(),
		endTime = moment(new Date(3000, 1, 1)).toISOString(),
	) {
		return parseFloat(
			await Client
				.useClient()
				.db($configurator.getDbPath('db/traffic'))
				.collection($configurator.getDbPath('db/traffic/routers'))
				.countDocuments({
					...selector,
					clickAt: {
						$gt: moment(Date.parse(startTime)).toDate(),
						$lte: moment(Date.parse(endTime)).toDate(),
					}
				})
		)
	}
}

module.exports = {Mongo}