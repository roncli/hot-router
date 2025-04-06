const RouterBase = require("../../routerBase");

// MARK: class CustomFailRoute
/**
 * A fail route for testing.
 */
class CustomFailRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/customFail";

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the /fail route.
     * @returns {void}
     */
    static get() {
        throw new Error("Intentional error for testing purposes");
    }
}

module.exports = CustomFailRoute;
