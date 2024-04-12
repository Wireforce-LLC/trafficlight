const _ = require("lodash");
const { $configurator } = require("./config");
const zeroBasic = require("basic-auth-parser");

function json({ req, res }, config) {
  return NewHttp.json({ req, res }, config)
}

function authByScheme(schema) {
  return NewHttp.enforceBasicAuthentication(schema)
}

class NewHttp {
  _req = undefined;
  _res = undefined;

  /**
   * Generates a negative HTTP response.
   * @param {string} data The error message.
   * @param {number} code HTTP status code, defaults to 500.
   * @returns An object representing a negative HTTP response.
   */
  static generateErrorResponse(data = "", code = 500) {
    return {
      response: {
        isOk: false,
        code,
      },

      data: null,
      error: data,
    };
  }

  /**
   * Generates a positive HTTP response.
   * @param {string} data The response data.
   * @param {number} code HTTP status code, defaults to 200.
   * @returns An object representing a positive HTTP response.
   */
  static generateSuccessResponse(data = "", code = 200) {
    return {
      response: {
        isOk: true,
        code,
      },

      data,
      error: null,
    };
  }

  /**
   * Creates an instance of Http with request and response objects.
   * @param {Request<Protocol>} req The request object.
   * @param {Response} res The response object.
   * @returns {Http} The Http instance.
   */
  static createInstance(req, res) {
    const http = new NewHttp();

    http._req = req;
    http._res = res;

    return http;
  }

  static json(
    { req, res },
    config
  ) {
    let body = undefined

    const http = new NewHttp();
    const configFinal = Object.assign({
      statusCode: 200,
      data: {}
    }, config)

    http._req = req;
    http._res = res;

    if (configFinal.statusCode >= 200 && configFinal.statusCode <= 299) {
      body = NewHttp.generateSuccessResponse(configFinal.data, configFinal.statusCode)
    } else {
      body = NewHttp.generateErrorResponse(configFinal.data, configFinal.statusCode)
    }

    http.setStatusCode(configFinal.statusCode || 200)
    http.sendJsonObject(body)
    http.endResponse()
  }

  /**
   * Sets the status code for the response.
   * @param {number} code The HTTP status code.
   * @returns {Http} The Http instance for chaining.
   */
  setStatusCode(code) {
    if (this._res) {
      this._res.statusCode = code;
    }

    return this;
  }

  /**
   * Sends a JSON object as the response.
   * @param {object|string} object The object to send, can be an object or a string.
   * @returns {Http} The Http instance for chaining.
   */
  sendJsonObject(object = {}) {
    this.setResponseHeaders({
      "Content-Type": "application/json",
    });

    if (_.isObject(object)) {
      this._res?.end(JSON.stringify(object, null, 1));
    } else if (_.isString(object)) {
      this._res?.end(object);
    }

    return this;
  }

  /**
   * Sets headers for the response.
   * @param {object} object An object containing header key-value pairs.
   * @returns {Http} The Http instance for chaining.
   */
  setResponseHeaders(object = {}) {
    _.toPairs(object).map((k) => {
      this._res.setHeader(k[0], k[1]);
    });

    return this;
  }

  /**
   * Sends an HTML response.
   * @param {string} raw The HTML string to send.
   * @returns {Http} The Http instance for chaining.
   */
  sendHtmlResponse(raw = "") {
    this.setResponseHeaders({
      "Content-Type": "text/html;",
    });
    this._res?.end(raw);
    return this;
  }

  /**
   * Redirects the client to a specified URL.
   * @param {string} url The URL to redirect to.
   * @returns {Http} The Http instance for chaining.
   */
  redirectClient(url = "") {
    this.setStatusCode(302);
    this.setResponseHeaders({
      Location: url,
    });
    this._res?.end();

    return this;
  }

  /**
   * Requires basic authentication for the current request.
   * @param {string} scheme The authentication scheme, defaults to 'Basic'.
   * @param {string} realm The authentication realm.
   * @returns {Http} The Http instance for chaining.
   */
  requireBasicAuthentication(scheme = "Basic", realm = "") {
    this.setStatusCode(401);
    this._res?.headers?.set("WWW-Authenticate", `${scheme} realm="${realm}"`);

    return this;
  }

  /**
   * Middleware to enforce basic authentication.
   * @param {string} schema The schema to validate against.
   * @returns {Function} The middleware function.
   */
  static enforceBasicAuthentication(schema) {
    return async (req, res, next) => {
      if (!_.isString(req.headers.authorization)) {
        return Http.createInstance(req, res)
          .requireBasicAuthentication("Basic", "Protected Area")
          .setStatusCode(401)
          .sendJsonObject(
            Http.generateNegativeResponse("Unauthorized: 'Basic' authorization header is missing.", 401),
          );
      }

      const credentials = zeroBasic(req.headers.authorization);
      const isValid = $configurator.checkAuthorizationValidity(
        schema,
        credentials.username,
        credentials.password,
      );

      if (!isValid) {
        return Http.createInstance(req, res)
          .requireBasicAuthentication("Basic", "Protected Area")
          .setStatusCode(403)
          .sendJsonObject(Http.generateNegativeResponse("Forbidden: Incorrect login or password.", 403));
      }

      return next();
    }
  }

  /**
   * Ends the response.
   * @returns {null} Null to signify the end of the operation.
   */
  endResponse() {
    this._res?.end();
    return null;
  }
}

module.exports = { NewHttp, response: { json }, request: {}, middleware: { authByScheme } }
