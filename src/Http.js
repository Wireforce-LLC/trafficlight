const _ = require("lodash");

class Http {
	_req = undefined
	_res = undefined

	static negative(data = "", code = 500) {
		return {
			response: {
				isOk: false,
				code
			},

			data: null,
			error: data
		}
	}


	static positive(data = "", code = 200) {
		return {
			response: {
				isOk: true,
				code
			},

			data,
			error: null
		}
	}


	/**
	 *
	 * @param {Request<Protocol>} req
	 * @param {Response} res
	 */
	static of(req, res) {
		const http = new Http()

		http._req = req
		http._res = res

		return http
	}

	statusCode(code) {
		if (this._res) {
			this._res.statusCode = code
		}

		return this
	}

	sendJsonObject(object = {}) {
		this._res?.headers?.set("content-type", 'application/json')

		if (_.isObject(object)) {
			this._res?.end(JSON.stringify(object, null, 1))
		} else if (_.isString(object)) {
			this._res?.end(object)
		}

		return this
	}
}

module.exports = { Http }