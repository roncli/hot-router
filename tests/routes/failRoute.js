const RouterBase = require("../../routerBase");

/**
 * A fail route for testing.
 */
class FailRoute extends RouterBase {
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/fail";

        return route;
    }

    /**
     * Handles GET requests to the /fail route.
     * @returns {void}
     */
    static get() {
        throw new Error("Intentional error for testing purposes");
    }
}

module.exports = FailRoute;
