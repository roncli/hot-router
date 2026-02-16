/**
 * @typedef {import("ws").WebSocket} WebSocket
 */

const RouterBase = require("../../../routerBase");

// MARK: class WsErrorRoute
/**
 * A sample error route for testing.
 */
class WsErrorRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/wsError";
        route.webSocket = true;

        return route;
    }

    // MARK: static connection
    /**
     * Handles web socket connections to the /ws route.
     * @returns {void}
     */
    static connection() {
        throw new Error("Intentional error for testing purposes");
    }
}

module.exports = WsErrorRoute;
