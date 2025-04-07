const RouterBase = require("../../routerBase");

// MARK: class CatchAllRoute
/**
 * A catch all route for testing.
 */
class CatchAllRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.catchAll = true;

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to this route.
     * @param {import("express").Request} req The request object.
     * @param {import("express").Response} res The response object.
     * @returns {void}
     */
    static get(req, res, next) {
        if (req.path === "/404") {
            next();
            return;
        }
        res.status(200).send(`Catch all route response, path: ${req.path}`);
    }
}

module.exports = CatchAllRoute;
