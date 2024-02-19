const _ = require("lodash");
const {readFileSync} = require("fs");
const path = require("node:path");
const mmdb = require("mmdb-lib");
const {config} = require("./config");

// Get a buffer with mmdb database, from file system or whereever.
const db = readFileSync(path.normalize(`${process.cwd()}/country_asn.mmdb`));

const reader = new mmdb.Reader(db);

// console.log(reader.get('139.178.131.9')); // inferred type `CityResponse`
// console.log(reader.getWithPrefixLength('66.6.44.4'));


const TOOLS = {
	/**
	 * @ignore
	 * @param args
	 * @param req
	 * @param res
	 * @return {boolean}
	 * @constructor
	 */
	IP(args, {req, res}) {
		const remoteIp = req.headers['cf-connecting-ip'] || _.get(req.headers, _.get(config, 'headersForward.ip', "X-Real-IP"))

		if (!remoteIp && _.get(config, 'policy.allowIfThereInsufficientIP', false)) {
			return true
		} else if (!remoteIp && !_.get(config, 'policy.allowIfThereInsufficientIP', false)) {
			return false
		}

		const results = []
		const requestInfo = reader.get(remoteIp)

		if (requestInfo == null) {
			return false
		}

		if (args.country) {
			if (_.isString(args.country)) {
				results.push(requestInfo.country === args.country)
			} else if (_.isArray(args.country)) {
				results.push(args.country.includes(requestInfo.country))
			} else {
				results.push(false)
			}
		}

		return results.includes(false) === false
	}
}

const BASIC_FILTERS = {
	APPLE_IP: async ({req, res}) => {
		const remoteIp = req.headers['cf-connecting-ip'] || _.get(req.headers, _.get(config, 'headersForward.ip', "x-real-ip"))

		if (!remoteIp && _.get(config, 'policy.allowIfThereInsufficientIP', false)) {
			return true
		} else if (!remoteIp && !_.get(config, 'policy.allowIfThereInsufficientIP', false)) {
			return false
		}

		const requestInfo = reader.get(remoteIp)

		if (requestInfo == null) {
			return undefined
		}

		return String(_.get(requestInfo, 'as_domain', 'false')).toLowerCase() === 'apple.com'
	}
}

class Filter {
	static FILTERS = {
		...BASIC_FILTERS,
		NOT_APPLE_IP: async (obj)=> !(await BASIC_FILTERS.APPLE_IP(obj))
	}

	static formatString(string) {
		return String(string)
			.replaceAll('$PWD', process.cwd())
			.replaceAll('$CWD', process.cwd())
			.replaceAll('$ROOT', process.cwd())
	}

	static replaceValueInNestedObject(obj, thisName = "$this", replacement) {
		if (typeof obj === 'object' && obj !== null) {
			if (Array.isArray(obj)) {
				obj.forEach((item, index) => {
					obj[index] = this.replaceValueInNestedObject(item, thisName, replacement);
				});
			} else {
				for (const key in obj) {
					if (Object.prototype.hasOwnProperty.call(obj, key)) {
						obj[key] = this.replaceValueInNestedObject(obj[key], thisName, replacement);
					}
				}
			}
		} else if (obj === thisName) {
			return replacement;
		}
		return obj;
	}


	static async useFilter(name, req, res) {
		return await _.get(this.FILTERS, name, () => undefined)({req, res})
	}

	static async useTool({name, args}, req, res) {
		return await _.get(TOOLS, name, (args, {req, res}) => undefined).call(null, args, {req, res})
	}

}

module.exports = {Filter, IPDetect: reader}