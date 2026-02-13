const RouterBase = require("../../routerBase");

// MARK: class Include
/**
 * An include route for testing inclusion.
 */
class Include extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.include = true;

        return route;
    }
}

module.exports = Include;
