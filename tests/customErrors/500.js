const RouterBase = require("../../routerBase");

// MARK: class Route500
/**
 * A route for testing 500 errors.
 */
class Route500 extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = super.route;

        route.serverError = true;

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the server error route.
     * @param {import("express").Request} req The request object.
     * @param {import("express").Response} res The response object.
     * @returns {void}
     */
    static get(req, res) {
        res.status(500).send("Intentional 500 error for testing purposes");
    }
}

module.exports = Route500;
