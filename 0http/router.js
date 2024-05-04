const _ = require("lodash");

const { $milkyWayKit } = require("../kits/MilkyWayKit");
const { Http } = require("../src/Http");
const { $routerMetricKit } = require("../kits/RouterMetricKit");
const { alsoMakeFunction } = require("../src/Also");
const { Filter } = require("../src/Filter");
const { $alsoLineKit } = require("../kits/AlsoLineKit");
const { camelCase } = require("lodash");

const { json } = require("../src/NewHttp").response;
const middleware = require("../src/NewHttp").middleware;

const mainRouterDynamic = (req, res) => {

    const route = _.get(req, "params.route", undefined)?.toLowerCase();

    if (!_.isString(route)) {
        return json({ req, res }, {
            statusCode: 500,
            data: "The router is not connected correctly. :route parameter is missing"
        })
    }

    $milkyWayKit.resolveRouter(route, { req, res }).then((resolved) => {
        if (resolved) {
        const routerType = String(resolved.out.type).toUpperCase();
        const alsoDoIt = _.get(resolved.out, "also", []);

        if ($configuratorKit.get("monitoring.registerTraffic", false)) {
            $routerMetricKit.dumpHttpRequest({ req }, resolved.if, resolved.meta);
        }

        if (!_.isEmpty(alsoDoIt)) {
            alsoDoIt.map((also) => {
            const name = _.get(also, "name", undefined);
            const props = Filter.maskObject(_.get(also, "props", {}), {
                ..._.mapKeys(req.query, (_, i) => "$get." + camelCase(i)),
                ..._.mapKeys(req.body, (_, i) => "$body." + camelCase(i)),
                ..._.mapKeys(req, (_, i) => "$req." + camelCase(i)),
            });

            if (!_.isEmpty(name)) {
                $alsoLineKit.execute(name, props);
            }
            });
        }

        if (_.isEmpty(resolved.out)) {
            return json({ req, res }, {
            statusCode: 200
            })
        }

        if (routerType === "JSON") {
            $milkyWayKit.processingHttpJson(resolved.out, { req, res });
        } else if (routerType === "HTML") {
            $milkyWayKit.processingHttpHtml(resolved.out, { req, res });
        } else if (routerType === "REDIRECT") {
            $milkyWayKit.processingHttpRedirect(resolved.out, { req, res });
        } else if (routerType === "PROXYPASS") {
            $milkyWayKit.processingHttpProxypass(resolved.out, { req, res });
        }

        } else {
        return json({ req, res }, {
            statusCode: 500,
            data: "The router is not connected correctly."
        })
        }
    });
};

/**
 * Middleware function to handle dynamic routing based on the route parameter.
 *
 * @param {Object} router - The Express router object.
 */
module.exports = (router) => {
    /**
     * Handles dynamic routing based on the route parameter.
     * The route parameter is expected to be the last part of the URL.
     * For example, if the URL is "/router/myRoute", then the route parameter is "myRoute".
     *
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    router.use("/router/", function (req, res) {
        req.params.route = req.path.replace("/router/", "");
        mainRouterDynamic(req, res);
    });

    /**
     * Handles dynamic routing based on the route parameter.
     * The route parameter is expected to be the last part of the URL.
     * For example, if the URL is "/router/myRoute", then the route parameter is "myRoute".
     *
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    router.get("/router/:route", mainRouterDynamic);

    /**
     * Handles dynamic routing based on the router and route parameters.
     * The router parameter is expected to be the first part of the URL,
     * and the route parameter is expected to be the last part of the URL.
     * For example, if the URL is "/myRouter/myRoute",
     * then the router parameter is "myRouter" and the route parameter is "myRoute".
     *
     * @param {Object} req - The request object.
     * @param {Object} res - The response object.
     */
    router.get("/:router/:route", mainRouterDynamic);
};
