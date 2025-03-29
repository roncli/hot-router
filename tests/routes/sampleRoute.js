const RouterBase = require("../../routerBase");

/**
 * A sample route for testing.
 */
class SampleRoute extends RouterBase {
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/sample";

        return route;
    }

    /**
     * Handles GET requests to the /sample route.
     * @param {import("express").Request} req - The request object.
     * @param {import("express").Response} res - The response object.
     * @returns {void}
     */
    static get(req, res) {
        res.status(200).send("Sample route response");
    }
}

module.exports = SampleRoute;
