/**
 * @typedef {import("express").Request} Request
 * @typedef {import("express").Response} Response
 * @typedef {import("express").NextFunction} NextFunction
 */

const createHttpError = require("http-errors");
const RouterBase = require("../../routerBase");

/**
 * An error route for testing.
 */
class NextErrorWithStatusRoute extends RouterBase {
    /**
     * Retrieves the route parameters for the class.
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        const route = {...super.route};

        route.path = "/nextErrorWithStatus";

        return route;
    }

    /**
     * Handles GET requests to the /nextErrorWithStatus route.
     * @param {Request} req The request object.
     * @param {Response} res The response object.
     * @param {NextFunction} next The next function to call.
     * @returns {void}
     */
    static get(req, res, next) {
        const error = createHttpError(503, "Intentional error for testing purposes passed to middleware");
        error.expose = true;
        next(error);
    }
}

module.exports = NextErrorWithStatusRoute;
