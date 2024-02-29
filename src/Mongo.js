const {Client} = require("./Client");
const {$configurator} = require("./config");
const _ = require("lodash");

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
	 * @return {Promise<(Document & {_id: InferIdType<Document>})[]>}
	 */
	static async selectRequestAnalyticObject(sort, limit, selector = {}) {
		return Array.of(
			...await Client
				.useClient()
				.db($configurator.getDbPath('db/traffic'))
				.collection($configurator.getDbPath('db/traffic/routers'))
				.find(selector)
				.sort({_id: sort === 1 ? 1 : -1})
				.limit(_.parseInt(limit || '128'))
				.toArray()
		)
	}
}

module.exports = {Mongo}