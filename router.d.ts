import {EventEmitter} from "events"
import {Router as ExpressRouter} from "express"

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
}

export = Router
