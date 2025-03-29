/**
 * @typedef {import("ws").WebSocket} WebSocket
 */

const RouterBase = require("../../../routerBase");

/**
 * A sample route for testing.
 */
class SampleRoute extends RouterBase {
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

    /**
     * Handles websocket connections to the /ws route.
     * @param {WebSocket} ws - The websocket object.
     * @returns {void}
     */
    static connection(ws) {
        ws.send("WebSocket connection established");
    }
}

module.exports = SampleRoute;
