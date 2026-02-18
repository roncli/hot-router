/**
 * @typedef {import("http-errors").HttpError} HttpErrors.HttpError
 * @typedef {import("./routerBase").InternalRoute} RouterBase.InternalRoute
 * @typedef {import("./routerBase").Route} RouterBase.Route
 * @typedef {["error", function({message: string, err: Error, req: Express.Request}): void]} RouterEvents
 * @typedef {import("websocket-express").Router} WebSocketExpress.Router
 * @typedef {import("websocket-express").WebSocketExpress} WebSocketExpress.WebSocketExpress
 * @typedef {import("websocket-express").WSResponse} WebSocketExpress.WSResponse
 */

const {EventEmitter} = require("events"),
    Express = require("express"),
    fs = require("fs/promises"),
    path = require("path");

const WsExpress = (() => {
    try {
        return require("websocket-express");
    } catch {
        return void 0;
    }
})();

// MARK: class Router
/**
 * A class that handles the router for the website.
 */
class Router extends EventEmitter {
    /** @type {{[x: string]: RouterBase.InternalRoute}} */
    #routes = {};

    #catchAllFilename = "";

    #notFoundFilename = "";

    #methodNotAllowedFilename = "";

    #serverErrorFilename = "";

    // MARK: async #attachErrorHandlers
    /**
     * Attaches error handlers to the provided router.
     * @param {Express.Router | WebSocketExpress.Router} webRouter The router to attach the error handlers to.
     * @returns {void}
     */
    #attachErrorHandlers(webRouter) {
        // 404 remaining pages.
        webRouter.use(async (req, res, next) => {
            if (res.headersSent) {
                // Clean up and end response.
                if (!res.writableEnded) {
                    res.end();
                }
                return;
            }

            if (this.#notFoundFilename !== "") {
                const route404 = this.#routes[this.#notFoundFilename];
                /* istanbul ignore else - We're only using the if for type narrowing. */
                if (route404.webSocket === false) {
                    await route404.class.get(req, res, next);
                }
                return;
            }

            res.status(404).send("HTTP 404 Not Found");
        });

        // 500 errors.
        webRouter.use(async (
            /** @type {HttpErrors.HttpError} */ err,
            /** @type {Express.Request} */ req,
            /** @type {Express.Response} */ res,
            /** @type {Express.NextFunction} */ next
        ) => {
            if (err.status && err.status !== 500 && err.expose) {
                res.status(err.status).send(err.message);
            } else {
                this.emit("error", {
                    message: "An unhandled error has occurred.",
                    err, req
                });

                await this.#handleServerError(req, res, next);
            }
        });
    }

    // MARK: async #checkCache
    /**
     * Checks the cache and refreshes it if necessary.
     * @param {string} file The name of the class.
     * @returns {Promise} A promise that resolves once the cache is checked.
     */
    async #checkCache(file) {
        // Ensure we've already loaded the class, otherwise bail.
        const route = this.#routes[file];

        const stats = await fs.stat(require.resolve(route.file));

        if (!route.lastModified || route.lastModified.getTime() !== stats.mtime.getTime()) {
            delete require.cache[require.resolve(route.file)];
            route.class = require(route.file);
            route.lastModified = stats.mtime;
        }
    }

    // MARK: async #checkCaches
    /**
     * Checks the caches for multiple files and refreshes them if necessary.
     * @param {string[]} includes The includes to check for.
     * @param {string} filename The file to check for.
     * @returns {Promise} A promise that resolves once the caches are checked.
     */
    async #checkCaches(includes, filename) {
        await Promise.all([
            ...includes.map((include) => this.#checkCache(include)),
            this.#checkCache(filename)
        ]);
    }

    // MARK: async #getClasses
    /**
     * Gets all of the available classes.
     * @param {string} dir The directory to get the classes for.
     * @returns {Promise} A promise that resolves when all the classes are retrieved.
     */
    async #getClasses(dir) {
        const filenames = [];

        for await (const dirEntry of await fs.opendir(dir)) {
            const file = dirEntry.name;
            const filename = path.resolve(dir, file);

            const stat = await fs.stat(filename);

            if (stat.isDirectory()) {
                await this.#getClasses(filename);
            } else {
                const routeClass = require(filename);

                /** @type {{route: RouterBase.Route}} */
                const {route} = routeClass;

                this.#routes[filename] = {
                    ...route,
                    file: filename,
                    lastModified: stat.mtime,
                    events: [],
                    methods: [],
                    class: routeClass
                };

                if (route.webSocket) {
                    this.#routes[filename].events = Object.getOwnPropertyNames(routeClass).filter((p) => typeof routeClass[p] === "function");
                } else if (!route.include) {
                    this.#routes[filename].methods = Object.getOwnPropertyNames(routeClass).filter((p) => typeof routeClass[p] === "function");
                }
                if (route.catchAll) {
                    this.#catchAllFilename = filename;
                } else if (route.notFound) {
                    this.#notFoundFilename = filename;
                } else if (route.methodNotAllowed) {
                    this.#methodNotAllowedFilename = filename;
                } else if (route.serverError) {
                    this.#serverErrorFilename = filename;
                }
                filenames.push(filename);
            }
        }
    }

    // MARK: #getWebRouter
    /**
     * Gets the web router to use for the website.
     * @param {object} options The options to use.
     * @param {boolean} [options.hot] Whether to use hot reloading for RouterBase classes.  Defaults to true.
     * @returns {Express.Router} The web router to use for the website.
     */
    #getWebRouter(options) {
        /** @type {Express.Router} */
        const webRouter = Express.Router();

        const filenames = Object.keys(this.#routes),
            includes = filenames.filter((c) => this.#routes[c].include),
            pages = filenames.filter((c) => !this.#routes[c].include && !this.#routes[c].webSocket && this.#routes[c].path && this.#routes[c].methods && this.#routes[c].methods.length > 0);

        // Set up page routes.
        pages.forEach((filename) => {
            const route = this.#routes[filename];

            /* istanbul ignore else - We're only using the if for type narrowing. */
            if (route.webSocket === false) {
                route.methods.forEach((method) => {
                    webRouter[method](route.path, ...route.middleware, async (/** @type {Express.Request} */ req, /** @type {Express.Response} */ res, /** @type {Express.NextFunction} */ next) => {
                        if (res.headersSent) {
                            next(new Error("Headers already sent."));
                            return;
                        }

                        try {
                            if (options.hot) {
                                await this.#checkCaches(includes, filename);
                            }

                            await Router.#restCall(req, res, next, route.class);
                        } catch (err) {
                            this.emit("error", {
                                message: `An error occurred in ${req.method.toLowerCase()} ${req.url} for ${route.path}.`,
                                err, req
                            });
                            await this.#handleServerError(req, res, next);
                        }
                    });
                });

                // Add a fallback for unsupported methods
                webRouter.all(route.path, async (req, res, next) => {
                    await this.#handleMethodNotAllowed(req, res, next);
                });
            }
        });

        // Use a catch all route if it is setup.
        if (this.#catchAllFilename !== "") {
            const routeCatchAll = this.#routes[this.#catchAllFilename];
            /* istanbul ignore else - We're only using the if for type narrowing. */
            if (routeCatchAll.webSocket === false) {
                webRouter.use(...routeCatchAll.middleware, async (req, res, next) => {
                    if (res.headersSent) {
                        next(new Error("Headers already sent."));
                        return;
                    }

                    try {
                        if (options.hot) {
                            await this.#checkCaches(includes, this.#catchAllFilename);
                        }

                        await Router.#restCall(req, res, next, routeCatchAll.class);
                    } catch (err) {
                        this.emit("error", {
                            message: `An error occurred in ${req.method.toLowerCase()} ${req.url} for the catch all path.`,
                            err, req
                        });
                        await this.#handleServerError(req, res, next);
                    }
                });
            }
        }

        return webRouter;
    }

    // MARK: async #getWebSocketRouter
    /**
     * Gets the web socket router to use for the website.
     * @param {object} options The options to use.
     * @param {boolean} [options.hot] Whether to use hot reloading for RouterBase classes.  Defaults to true.
     * @returns {WebSocketExpress.Router | undefined} The web socket router to use for the website.
     */
    #getWebSocketRouter(options) {
        const webSocketRouter = WsExpress ? new WsExpress.Router() : void 0;

        const filenames = Object.keys(this.#routes),
            webSockets = filenames.filter((c) => this.#routes[c].webSocket);

        // Set up web socket routes.
        webSockets.forEach((filename) => {
            const route = this.#routes[filename];

            /* istanbul ignore else - We're only using the if for type narrowing. */
            if (route.webSocket) {
                if (WsExpress && webSocketRouter instanceof WsExpress.Router) {
                    webSocketRouter.ws(route.path, ...route.middleware, async (req, res) => {
                        const ws = await res.accept();

                        route.events.forEach((event) => {
                            ws.on(event === "connection" ? "_init" : event, async (...args) => {
                                try {
                                    if (options.hot) {
                                        await this.#checkCaches([], filename);
                                    }

                                    await route.class[event](ws, ...args);
                                } catch (err) {
                                    ws.send(JSON.stringify({error: "An unhandled error has occurred."}));
                                    this.emit("error", {
                                        message: "An unhandled WebSocket error has occurred.",
                                        err, req
                                    });
                                }
                            });
                        });

                        // Since the connection event is not re-fired, we use the _init event to forward the connection event to the client.
                        ws.emit("_init", req);
                    });
                }
            }
        });

        return webSocketRouter;
    }

    // MARK: async #handleMethodNotAllowed
    /**
     * Handles a 405 Method Not Allowed error.
     * @param {Express.Request} req The request object.
     * @param {Express.Response} res The response object.
     * @param {Express.NextFunction} next The next middleware function.
     * @returns {Promise<void>} A promise that resolves when the error is handled.
     */
    async #handleMethodNotAllowed(req, res, next) {
        if (this.#methodNotAllowedFilename === "") {
            res.status(405).send("HTTP 405 Method Not Allowed");
        } else {
            const route405 = this.#routes[this.#methodNotAllowedFilename];
            /* istanbul ignore else - We're only using the if for type narrowing. */
            if (route405.webSocket === false) {
                await route405.class.get(req, res, next);
            }
        }
    }

    // MARK: async #handleServerError
    /**
     * Handles a 500 Internal Server Error.
     * @param {Express.Request} req The request object.
     * @param {Express.Response} res The response object.
     * @param {Express.NextFunction} next The next middleware function.
     * @returns {Promise<void>} A promise that resolves when the error is handled.
     */
    async #handleServerError(req, res, next) {
        if (this.#serverErrorFilename === "") {
            if (res.headersSent) {
                // Clean up and end response.
                if (!res.writableEnded) {
                    res.end();
                }
                return;
            }
            res.status(500).send("HTTP 500 Server Error");
        } else {
            const route500 = this.#routes[this.#serverErrorFilename];
            /* istanbul ignore else - We're only using the if for type narrowing. */
            if (route500.webSocket === false) {
                await route500.class.get(req, res, next);
            }
        }
    }

    // MARK: static async #restCall
    /**
     * Makes a REST call to the appropriate method on the route class.
     * @param {Express.Request} req The request object.
     * @param {Express.Response} res The response object.
     * @param {Express.NextFunction} next The next middleware function.
     * @param {object} routeClass The route class to call the method on.
     * @returns {Promise} A promise that resolves when the call is complete.
     */
    static async #restCall(req, res, next, routeClass) {
        if (req.method.toLowerCase() === "head") {
            if (routeClass.head) {
                await routeClass.head(req, res, next);
            } else {
                await routeClass.get(req, res, next);
            }
        } else {
            await routeClass[req.method.toLowerCase()](req, res, next);
        }
    }

    // MARK: addListener
    /**
     * Adds a listener.
     * @param {RouterEvents} args The arguments.
     * @returns {this} The return.
     */
    addListener(...args) {
        return super.addListener(...args);
    }

    // MARK: async error
    /**
     * Handles a router error.
     * @param {HttpErrors.HttpError} err The error object.
     * @param {Express.Request} req The request.
     * @param {Express.Response} res The response.
     * @param {Express.NextFunction} next The function to be called if the error is not handled.
     * @returns {Promise} A promise that resolves when the error is handled.
     */
    async error(err, req, res, next) {
        if (err.status && err.status !== 500 && err.expose) {
            if (res.headersSent) {
                // Clean up and end response.
                if (!res.writableEnded) {
                    res.end();
                }
                return;
            }

            res.status(err.status).send(err.message);
        } else {
            this.emit("error", {
                message: "An unhandled error has occurred.",
                err, req
            });

            await this.#handleServerError(req, res, next);
        }
    }

    // MARK: on
    /**
     * Adds a listener.
     * @param {RouterEvents} args The arguments.
     * @returns {this} The return.
     */
    on(...args) {
        return super.on(...args);
    }

    // MARK: async setRoutes
    /**
     * Sets the routes for the website.
     * @param {string} routesPath The directory with the route classes.
     * @param {Express.Application | WebSocketExpress.WebSocketExpress} app The Express application to use for the routers.
     * @param {object} [options] The options to use.
     * @param {boolean} [options.hot] Whether to use hot reloading for RouterBase classes.  Defaults to true.
     * @param {string} [options.webRoot] The root path to use for the web router.  Defaults to "/".
     * @param {string} [options.webSocketRoot] The root path to use for the web socket router.  Defaults to "/".
     * @returns {Promise<void>}
     */
    async setRoutes(routesPath, app, options) {
        if (!app) {
            throw new Error("An Express or WebSocketExpress application must be provided.");
        }

        options = {...{hot: false, webRoot: "/", webSocketRoot: "/"}, ...options || {}};

        await this.#getClasses(routesPath);

        const webSocketRouter = this.#getWebSocketRouter(options);
        const webRouter = this.#getWebRouter(options);
        this.#attachErrorHandlers(webRouter);

        if (WsExpress && app instanceof WsExpress.WebSocketExpress) {
            app.use(options.webSocketRoot, webSocketRouter);
            app.useHTTP(options.webRoot, webRouter);
        } else {
            /** @type {Express.Application} */(app).use(options.webRoot, webRouter); // eslint-disable-line @stylistic/no-extra-parens
        }
    }
}

module.exports = Router;
