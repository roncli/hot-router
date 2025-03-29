const RouterBase = require("../../../routerBase");

/**
 * An include route for testing inclusion.
 */
class Include extends RouterBase {
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
