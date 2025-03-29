const RouterBase = require("../../routerBase");

/**
 * A headers route for testing.
 */
class HeadersRoute extends RouterBase {
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/headers";

        return route;
    }

    /**
     * Handles GET requests to the /headers route.
     * @param {import("express").Request} req - The request object.
     * @param {import("express").Response} res - The response object.
     * @returns {void}
     */
    static get(req, res) {
        res.status(200).send("Headers route response");
    }
}

module.exports = HeadersRoute;
