/**
 * @typedef {["error", function({message: string, err: Error, req: Express.Request}): void]} Events
 * @typedef {import("express").NextFunction} Express.NextFunction
 * @typedef {import("express").Request} Express.Request
 * @typedef {import("express").Response} Express.Response
 * @typedef {import("express").Router} Express.Router
 * @typedef {import("express-ws").Router} expressWs.Router
 * @typedef {import("http-errors").HttpError} HttpErrors.HttpError
 * @typedef {import("./routerBase").InternalRoute} RouterBase.InternalRoute
 * @typedef {import("./routerBase").Route} RouterBase.Route
 */

const EventEmitter = require("events").EventEmitter,
    express = require("express"),
    fs = require("fs/promises"),
    path = require("path");

// MARK: class Router
/**
 * A class that handles the router for the website.
 */
class Router extends EventEmitter {
    /** @type {{[x: string]: RouterBase.InternalRoute}} */
    #routes = {};

    #notFoundFilename = "";

    #methodNotAllowedFilename = "";

    #serverErrorFilename = "";

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

    // MARK: async #getClasses
    /**
     * Gets all of the available classes.
     * @param {string} dir The directory to get the classes for.
     * @returns {Promise} A promise that resolves when all the classes are retrieved.
     */
    async #getClasses(dir) {
        const list = await fs.readdir(dir);
        const filenames = [];

        for (const file of list) {
            const filename = path.resolve(dir, file);

            const stat = await fs.stat(filename);

            if (stat && stat.isDirectory()) {
                await this.#getClasses(filename);
            } else {
                const routeClass = require(filename);

                /** @type {RouterBase.Route} */
                const route = routeClass.route;

                this.#routes[filename] = route;
                if (route.webSocket) {
                    this.#routes[filename].events = Object.getOwnPropertyNames(routeClass).filter((p) => typeof routeClass[p] === "function");
                } else if (!route.include) {
                    this.#routes[filename].methods = Object.getOwnPropertyNames(routeClass).filter((p) => typeof routeClass[p] === "function");
                }
                if (route.notFound) {
                    this.#notFoundFilename = filename;
                } else if (route.methodNotAllowed) {
                    this.#methodNotAllowedFilename = filename;
                } else if (route.serverError) {
                    this.#serverErrorFilename = filename;
                }
                this.#routes[filename].file = filename;
                filenames.push(filename);
                this.#routes[filename].class = routeClass;
                this.#routes[filename].lastModified = (await fs.stat(require.resolve(route.file))).mtime;
            }
        }
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
            if (route500.webSocket === false) {
                await route500.class.get(req, res, next);
            }
        }
    }

    // MARK: addListener
    /**
     * Adds a listener.
     * @param {Events} args The arguments.
     * @returns {this} The return.
     */
    addListener(...args) {
        return super.addListener(...args);
    }

    // MARK: on
    /**
     * Adds a listener.
     * @param {Events} args The arguments.
     * @returns {this} The return.
     */
    on(...args) {
        return super.on(...args);
    }

    // MARK: async getRouter
    /**
     * Gets the router to use for the website.
     * @param {string} routesPath The directory with the route classes.
     * @param {object} [options] The options to use.
     * @param {boolean} [options.hot] Whether to use hot reloading for RouterBase classes.  Defaults to true.
     * @returns {Promise<expressWs.Router>} A promise that resolves with the router to use for the website.
     */
    async getRouter(routesPath, options) {
        options = {...{hot: false}, ...options || {}};

        await this.#getClasses(routesPath);

        const router = express.Router(),
            filenames = Object.keys(this.#routes),
            includes = filenames.filter((c) => this.#routes[c].include),
            webSockets = filenames.filter((c) => this.#routes[c].webSocket),
            pages = filenames.filter((c) => !this.#routes[c].include && !this.#routes[c].webSocket && this.#routes[c].path && this.#routes[c].methods && this.#routes[c].methods.length > 0);

        // Set up websocket routes.
        webSockets.forEach((filename) => {
            const route = this.#routes[filename];

            if (route.webSocket) {
                router.ws(route.path, ...route.middleware, (ws, req) => {
                    // @ts-ignore
                    ws._url = req.url.replace("/.websocket", "").replace(".websocket", "") || "/";

                    route.events.forEach((event) => {
                        ws.on(event === "connection" ? "_init" : event, (...args) => {
                            if (route.webSocket) {
                                route.class[event](ws, ...args);
                            }
                        });
                    });

                    // Since the connection event is not re-fired, we use the _init event to forward the connection event to the client.
                    ws.emit("_init", req);
                });
            }
        });

        // Set up page routes.
        pages.forEach((filename) => {
            const route = this.#routes[filename];

            if (route.webSocket === false) {
                route.methods.forEach((method) => {
                    router[method](route.path, ...route.middleware, async (/** @type {Express.Request} */ req, /** @type {Express.Response} */ res, /** @type {Express.NextFunction} */ next) => {
                        if (res.headersSent) {
                            next(new Error("Headers already sent."));
                        }

                        try {
                            if (options.hot) {
                                for (const include of includes) {
                                    await this.#checkCache(include);
                                }
                                await this.#checkCache(filename);
                            }

                            await route.class[req.method.toLowerCase()](req, res, next);
                            return;
                        } catch (err) {
                            this.emit("error", {
                                message: `An error occurred in ${req.method.toLowerCase()} ${route.path} from ${req.ip} for ${req.url}.`,
                                err, req
                            });
                        }

                        await this.#handleServerError(req, res, next);
                    });
                });

                // Add a fallback for unsupported methods
                router.all(route.path, async (req, res, next) => {
                    await this.#handleMethodNotAllowed(req, res, next);
                });
            }
        });

        // 404 remaining pages.
        router.use(async (req, res, next) => {
            if (res.headersSent) {
                // Clean up and end response.
                if (!res.writableEnded) {
                    res.end();
                }
                return;
            }

            if (this.#notFoundFilename !== "") {
                const route404 = this.#routes[this.#notFoundFilename];
                if (route404.webSocket === false) {
                    await route404.class.get(req, res, next);
                }
                return;
            }

            res.status(404).send("HTTP 404 Not Found");
        });

        // 500 errors.
        router.use(async (err, req, res, next) => {
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

        return router;
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
}

module.exports = Router;
