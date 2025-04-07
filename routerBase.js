/**
 * @typedef {import("./routerBase").Route} RouterBase.Route
 */

// MARK: class RouterBase
/**
 * The base class for a router class.
 * @abstract
 */
class RouterBase {
    // MARK: static get route
    /**
     * Retrieves the route parameters for the class.
     * @abstract
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        if (!Object.hasOwn(this, "route")) {
            throw new Error(`You must implement the route property for ${this.name}.`);
        }

        return {
            include: false,
            catchAll: false,
            webSocket: false,
            notFound: false,
            methodNotAllowed: false,
            serverError: false,
            middleware: []
        };
    }
}

module.exports = RouterBase;
