import {EventEmitter} from "events"
import {Application, NextFunction, Request, Response, Router as expressRouter} from "express"
import {HttpError} from "http-errors"
import {Router as wsRouter, WebSocketExpress} from "websocket-express"

/**
 * The options for the router.
 */
interface RouterOptions {
    hot?: boolean
    webRoot?: string
    webSocketRoot?: string
}

declare class Router extends EventEmitter {
    /**
     * Adds an error event listener.
     * @param {string} event The event name.
     * @param {function} listener The listener function.
     * @returns {this} The router instance.
     */
    addListener(event: "error", listener: (arg: Router.RouterErrorEvent) => void): this

    /**
     * Adds an error event listener.
     * @param {string} event The event name.
     * @param {function} listener The listener function.
     * @returns {this} The router instance.
     */
    on(event: "error", listener: (arg: Router.RouterErrorEvent) => void): this

    /**
     * Gets the routers to use for the website.
     * @fires Router#error
     * @param {string} routesPath The directory with the route classes.
     * @param {RouterOptions} [options] The options to use.
     * @returns {Promise<{webRouter: expressRouter, webSocketRouter?: wsRouter}>} A promise that resolves with the routers to use for the website.
     */
    setRoutes(routesPath: string, app: Application | WebSocketExpress, options?: RouterOptions): Promise<{webRouter: expressRouter, webSocketRouter?: wsRouter}>

    /**
     * Handles a router error.
     * @param {HttpError} err The error object.
     * @param {Request} req The request.
     * @param {Response} res The response.
     * @param {NextFunction} next The function to be called if the error is not handled.
     * @returns {Promise<void>}
     */
    error(err: HttpError, req: Request, res: Response, next: NextFunction): Promise<void>
}

declare namespace Router {
    /**
     * The event emitted when there is an error in the router.
     */
    export interface RouterErrorEvent {
        message: string
        err: HttpError
        req: Request
    }
}

export = Router
