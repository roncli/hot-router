const RouterBase = require("../../routerBase");

// MARK: class HeadersRoute
/**
 * A headers route for testing.
 */
class HeadersRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/headers";

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the /headers route.
     * @param {import("express").Request} _req The request object.
     * @param {import("express").Response} res The response object.
     * @returns {void}
     */
    static get(_req, res) {
        res.status(200).send("Headers route response");
    }
}

module.exports = HeadersRoute;
