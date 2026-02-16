const RouterBase = require("../../routerBase");

// MARK: class Route404
/**
 * A route for testing 404 errors.
 */
class Route404 extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = super.route;

        route.notFound = true;

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the server error route.
     * @param {import("express").Request} _req The request object.
     * @param {import("express").Response} res The response object.
     * @returns {void}
     */
    static get(_req, res) {
        res.status(404).send("Intentional 404 error for testing purposes");
    }
}

module.exports = Route404;
