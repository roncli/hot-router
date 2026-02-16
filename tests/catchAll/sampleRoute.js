const RouterBase = require("../../routerBase");

// MARK: class SampleRoute
/**
 * A sample route for testing.
 */
class SampleRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/sample";

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the /sample route.
     * @param {import("express").Request} _req The request object.
     * @param {import("express").Response} res The response object.
     * @returns {void}
     */
    static get(_req, res) {
        res.status(200).send("Sample route response");
    }
}

module.exports = SampleRoute;
