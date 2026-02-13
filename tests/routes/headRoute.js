const RouterBase = require("../../routerBase");

// MARK: class HeadRoute
/**
 * A head route for testing.
 */
class HeadRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/head";

        return route;
    }

    // MARK: static head
    /**
     * Handles HEAD requests to the /head route.
     * @param {import("express").Request} req The request object.
     * @param {import("express").Response} res The response object.
     * @returns {void}
     */
    static head(req, res) {
        res.status(200).end();
    }
}

module.exports = HeadRoute;
