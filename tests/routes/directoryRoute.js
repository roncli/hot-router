const RouterBase = require("../../routerBase");

// MARK: class DirectoryRoute
/**
 * A directory route for testing.
 */
class DirectoryRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = /.*\/$/;

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the /fail route.
     * @param {import("express").Request} req - The request object.
     * @param {import("express").Response} res - The response object.
     * @returns {void}
     */
    static get(req, res) {
        res.status(200).send(`Directory route response: ${req.path}`);
    }
}

module.exports = DirectoryRoute;
