const _ = require("lodash");
const { $configurator } = require("./config");
const zeroBasic = require("basic-auth-parser");

/**
 * Represents HTTP operations and responses.
 */
class Http {
  _req = undefined;
  _res = undefined;

  /**
   * Generates a negative HTTP response.
   * @param {string} data The error message.
   * @param {number} code HTTP status code, defaults to 500.
   * @returns An object representing a negative HTTP response.
   */
  static negative(data = "", code = 500) {
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
  static positive(data = "", code = 200) {
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
  static of(req, res) {
    const http = new Http();

    http._req = req;
    http._res = res;

    return http;
  }

  /**
   * Sets the status code for the response.
   * @param {number} code The HTTP status code.
   * @returns {Http} The Http instance for chaining.
   */
  statusCode(code) {
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
    this.setHeaders({
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
  setHeaders(object = {}) {
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
  sendHtml(raw = "") {
    this.setHeaders({
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
  redirect(url = "") {
    this.statusCode(302);
    this.setHeaders({
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
  requireBasicAuth(scheme = "Basic", realm = "") {
    this.statusCode(401);
    this._res?.headers?.set("WWW-Authenticate", `${scheme} realm=${realm}`);

    return this;
  }

  /**
   * Middleware to enforce basic authentication.
   * @param {string} schema The schema to validate against.
   * @returns {Function} The middleware function.
   */
  static basicAuthMiddleware(schema) {
    return async (req, res, next) => {
      if (!_.isString(req.headers.authorization)) {
        return Http.of(req, res)
          .requireBasicAuth("Basic", "Hello")
          .sendJsonObject(
            Http.negative("This route requires 'Basic' authorization"),
          );
      }

      if (
        $configurator.checkAuthorizationValidity(
          schema,
          zeroBasic(req.headers.authorization).username,
          zeroBasic(req.headers.authorization).password,
        )
      ) {
        return next();
      }

      return Http.of(req, res)
        .requireBasicAuth("Basic", "Hello")
        .sendJsonObject(Http.negative("Login or password is incorrect"));
    };
  }

  /**
   * Ends the response.
   * @returns {null} Null to signify the end of the operation.
   */
  end() {
    this._res?.end();
    return null;
  }
}

module.exports = { Http };
