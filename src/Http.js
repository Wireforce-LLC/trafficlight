const _ = require("lodash");
const {$configurator} = require("./config");
const zeroBasic = require("basic-auth-parser");

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

	requireBasicAuth(scheme = 'Basic', realm="") {
		this.statusCode(401)
		this._res?.headers?.set("WWW-Authenticate", `${scheme} realm=${realm}`)

		return this
	}

	static basicAuthMiddleware(schema) {
		return async (req, res, next) => {
			if (!_.isString(req.headers.authorization)) {
				return Http
					.of(req, res)
					.requireBasicAuth("Basic", "Hello")
					.sendJsonObject(
						Http.negative(
							"This route requires 'Basic' authorization"
						)
					)
			}

			if (
				$configurator.checkAuthorizationValidity(
					schema,
					zeroBasic(req.headers.authorization).username,
					zeroBasic(req.headers.authorization).password,
				)
			) {
				return next()
			}

			return Http
				.of(req, res)
				.requireBasicAuth("Basic", "Hello")
				.sendJsonObject(
					Http.negative(
						"Login or password is incorrect"
					)
				)
		}
	}
	end() {
		this._res?.end()
		return null
	}
}

module.exports = { Http }