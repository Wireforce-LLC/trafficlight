const _ = require("lodash");

const { $databaseKit } = require("../kits/DatabaseKit");
const { json } = require("../src/NewHttp").response;
const middleware = require("../src/NewHttp").middleware;


module.exports = (router) => {
  /**
   * Handles the count of datasets within a specific time range.
   * @param {Object} req - The request object, containing query parameters for startTime and endTime.
   * @param {Object} res - The response object used to send back the count.
   * @param {Function} next - The next middleware function in the stack.
   */
  router.post(
    "/dataset/count",

    middleware.authByScheme("admins"),
    async (req, res) => {
      const query = _.get(req, "query", undefined);

      const count = await $databaseKit.countHttpRequest(req.body, {
        startTime: query.startTime,
        endTime: query.endTime,
      });

      return json({ req, res }, {
        statusCode: 200,
        data: {
          count
        }
      })
    },
  );

  /**
   * Handles the selection of datasets based on query parameters.
   * @param {Object} req - The request object, containing body and query parameters for sorting and limiting the selection.
   * @param {Object} res - The response object used to send back the selected datasets.
   */
  router.post(
    "/dataset/select",

    middleware.authByScheme("admins"),
    async (req, res) => {
      const query = _.get(req, "query", undefined);

      const sort = _.get(query, "sort", "abc") === "abc" ? 1 : -1;
      const limit = _.parseInt(_.get(query, "limit", "128"));

      const selected = await $databaseKit.findHttpRequests(req.body, {
        sort: parseInt(sort),
        limit: parseInt(limit),
        startTime: query.startTime,
        endTime: query.endTime,
      });

      return json({ req, res }, {
        statusCode: 200,
        data: selected
      })
    },
  );

  router.get(
    "/dataset/statistic",

    // middleware.authByScheme("admins"),
    async (req, res) => {

      const allAllowedCount = await $databaseKit.countHttpRequest({
        "meta.noindex": { "$ne": true },
        _if: true
      });

      const allDisallowedCount = await $databaseKit.countHttpRequest({
        "meta.noindex": { "$ne": true },
        _if: false
      });

      const allHttpRequestsCount = await $databaseKit.countHttpRequest({
        "meta.noindex": { "$ne": true },
      });

      const allNotIndexHttpRequestsCount = await $databaseKit.countHttpRequest({
        "meta.noindex": { "$eq": true },
      });

      return json({ req, res }, {
        statusCode: 200,
        data: {
          allDisallowedCount,
          allAllowedCount,
          allHttpRequestsCount,
          allNotIndexHttpRequestsCount
        }
      })
    },
  );
};
