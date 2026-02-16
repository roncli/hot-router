/**
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 * @typedef {import("express").NextFunction} NextFunction
 */

const HttpErrors = require("http-errors");
const RouterBase = require("../../routerBase");

// MARK: class NextErrorWithStatusRoute
/**
 * An error route for testing.
 */
class NextErrorWithStatusRoute extends RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/nextErrorWithStatus";

        return route;
    }

    // MARK: static get
    /**
     * Handles GET requests to the /nextErrorWithStatus route.
     * @param {Request} _req The request object.
     * @param {Response} _res The response object.
     * @param {NextFunction} next The next function to call.
     * @returns {void}
     */
    static get(_req, _res, next) {
        const error = HttpErrors(503, "Intentional error for testing purposes passed to middleware");
        error.expose = true;
        next(error);
    }
}

module.exports = NextErrorWithStatusRoute;
