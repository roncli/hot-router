/**
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 * @typedef {import("express").NextFunction} NextFunction
 */

const RouterBase = require("../../routerBase");

// MARK: class NextErrorRoute
/**
 * An error route for testing.
 */
class NextErrorRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/nextError";

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the /nextError route.
     * @param {Request} _req The request object.
     * @param {Response} _res The response object.
     * @param {NextFunction} next The next function to call.
     * @returns {void}
     */
    static get(_req, _res, next) {
        const error = new Error("Intentional error for testing purposes passed to middleware");
        next(error);
    }
}

module.exports = NextErrorRoute;
