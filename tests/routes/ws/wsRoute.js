/**
 * @typedef {import("ws").WebSocket} WS.WebSocket
 */

const RouterBase = require("../../../routerBase");

// MARK: class WsRoute
/**
 * A sample route for testing.
 */
class WsRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/ws";
        route.webSocket = true;

        return route;
    }

    // MARK: static connection
    /**
     * Handles web socket connections to the /ws route.
     * @param {WS.WebSocket} ws The web socket object.
     * @returns {void}
     */
    static connection(ws) {
        ws.send("WebSocket connection established", {mask: false});
    }

    // MARK: static close
    /**
     * Handles web socket disconnections from the /ws route.
     * @param {WS.WebSocket} ws The web socket object.
     * @returns {void}
     */
    static close(ws) {
        ws.close();
    }
}

module.exports = WsRoute;
