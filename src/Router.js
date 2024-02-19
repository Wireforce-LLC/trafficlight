const YAML = require('yaml')
const fs = require("node:fs");
const _ = require("lodash");
const {Filter} = require("./Filter");

class Router {
	static async make(object, name, http) {
		let results = []

		if (!_.isObject(object)) {
			return null
		}

		const {req, res} = http

		const if_ = _.get(object, 'if', {})
		const then_ = _.get(object, 'then', {})
		const else_ = _.get(object, 'else', {})

		if (!_.isObject(if_) || !_.isObject(then_) || !_.isObject(else_)) {
			return null
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
		const data = String(fs.readFileSync(`${process.cwd()}/router/${name}.yml`))

		return YAML.parse(data)
	}

	static isRouterExists(name) {
		return fs.existsSync(`${process.cwd()}/router/${name}.yml`)
	}
}

module.exports = {Router}