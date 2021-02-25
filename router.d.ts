import {EventEmitter} from "events"
import {Router as ExpressRouter, NextFunction} from "express"

declare class Router extends EventEmitter {
    addListener(event: "error", listener: (arg: {message: string, err: Error, req: Express.Request}) => void): this
    on(event: "error", listener: (arg: {message: string, err: Error, req: Express.Request}) => void): this

    /**
     * Gets the router to use for the website.
     * @fires Router#error
     * @param {string} routesPath The directory with the route classes.
     * @param {object} [options] The options to use.
     * @param {boolean} [options.hot] Whether to use hot reloading for RouterBase classes.  Defaults to true.
     * @returns {Promise<ExpressRouter>} A promise that resolves with the router to use for the website.
     */
    getRouter(routesPath: string, options?: {hot?: boolean}): Promise<ExpressRouter>

    /**
     * Handles a router error.
     * @param {Error} err The error object.
     * @param {Express.Request} req The request.
     * @param {Express.Response} res The response.
     * @param {NextFunction} next The function to be called if the error is not handled.
     * @returns {Promise} A promise that resolves when the error is handled.
     */
    error(err: Error, req: Express.Request, res: Express.Response, next: NextFunction): Promise<void>
}

export = Router
