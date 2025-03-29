const RouterBase = require("../../routerBase");

/**
 * A route for testing 404 errors.
 */
class Route404 extends RouterBase {
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = super.route;

        route.notFound = true;

        return route;
    }

    /**
     * Handles GET requests to the server error route.
     * @param {import("express").Request} req The request object.
     * @param {import("express").Response} res The response object.
     * @returns {void}
     */
    static get(req, res) {
        res.status(404).send("Intentional 404 error for testing purposes");
    }
}

module.exports = Route404;
