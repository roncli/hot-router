import {EventEmitter} from "events"
import {NextFunction, Router as expressRouter} from "express"
import {Router as wsRouter} from "websocket-express";

/**
 * The event emitted when there is an error in the router.
 */
interface RouterErrorEvent {
    message: string;
    err: Error;
    req: Express.Request;
}

/**
 * The options for the router.
 */
interface RouterOptions {
    hot?: boolean
}

declare class Router extends EventEmitter {
    /**
     * Adds an error event listener.
     * @param {string} event The event name.
     * @param {function} listener The listener function.
     * @returns {this} The router instance.
     */
    addListener(event: "error", listener: (arg: RouterErrorEvent) => void): this

    /**
     * Adds an error event listener.
     * @param {string} event The event name.
     * @param {function} listener The listener function.
     * @returns {this} The router instance.
     */
    on(event: "error", listener: (arg: RouterErrorEvent) => void): this

    /**
     * Gets the routers to use for the website.
     * @fires Router#error
     * @param {string} routesPath The directory with the route classes.
     * @param {RouterOptions} [options] The options to use.
     * @returns {Promise<{webRouter: expressRouter, websocketRouter?: wsRouter}>} A promise that resolves with the routers to use for the website.
     */
    getRouters(routesPath: string, options?: RouterOptions): Promise<{webRouter: expressRouter, websocketRouter?: wsRouter}>

    /**
     * Handles a router error.
     * @param {Error} err The error object.
     * @param {Express.Request} req The request.
     * @param {Express.Response} res The response.
     * @param {NextFunction} next The function to be called if the error is not handled.
     * @returns {Promise<void>}
     */
    error(err: Error, req: Express.Request, res: Express.Response, next: NextFunction): Promise<void>
}

export = Router
