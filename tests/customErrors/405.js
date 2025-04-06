const RouterBase = require("../../routerBase");

// MARK: class Route405
/**
 * A route for testing 405 errors.
 */
class Route405 extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = super.route;

        route.methodNotAllowed = true;

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
        res.status(405).send("Intentional 405 error for testing purposes");
    }
}

module.exports = Route405;
