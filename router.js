/**
 * @typedef {["error", function({message: string, err: Error, req: Express.Request}): void]} Events
 * @typedef {import("express").Request} Express.Request
 * @typedef {import("express").Response} Express.Response
 * @typedef {import("express").Router} Express.Router
 * @typedef {import("./routerBase").Route} RouterBase.Route
 */

const EventEmitter = require("events").EventEmitter,
    fs = require("fs/promises"),
    path = require("path"),

    express = require("express");

/** @type {{[x: string]: RouterBase.Route}} */
const routes = {};

let notFoundFilename = "",
    methodNotAllowedFilename = "",
    serverErrorFilename = "";

//  ####                  #
//  #   #                 #
//  #   #   ###   #   #  ####    ###   # ##
//  ####   #   #  #   #   #     #   #  ##  #
//  # #    #   #  #   #   #     #####  #
//  #  #   #   #  #  ##   #  #  #      #
//  #   #   ###    ## #    ##    ###   #
/**
 * A class that handles the router for the website.
 */
class Router extends EventEmitter {
    //          #     #  #      #            #
    //          #     #  #                   #
    //  ###   ###   ###  #     ##     ###   ###    ##   ###    ##   ###
    // #  #  #  #  #  #  #      #    ##      #    # ##  #  #  # ##  #  #
    // # ##  #  #  #  #  #      #      ##    #    ##    #  #  ##    #
    //  # #   ###   ###  ####  ###   ###      ##   ##   #  #   ##   #
    /**
     * Adds a listener.
     * @param {Events} args The arguments.
     * @returns {this} The return.
     */
    addListener(...args) {
        return super.addListener(...args);
    }

    //  ##   ###
    // #  #  #  #
    // #  #  #  #
    //  ##   #  #
    /**
     * Adds a listener.
     * @param {Events} args The arguments.
     * @returns {this} The return.
     */
    on(...args) {
        return super.on(...args);
    }

    //       #                 #      ##               #
    //       #                 #     #  #              #
    //  ##   ###    ##    ##   # #   #      ###   ##   ###    ##
    // #     #  #  # ##  #     ##    #     #  #  #     #  #  # ##
    // #     #  #  ##    #     # #   #  #  # ##  #     #  #  ##
    //  ##   #  #   ##    ##   #  #   ##    # #   ##   #  #   ##
    /**
     * Checks the cache and refreshes it if necessary.
     * @param {string} file The name of the class.
     * @returns {Promise} A promise that resolves once the cache is checked.
     */
    async checkCache(file) {
        // Ensure we've already loaded the class, otherwise bail.
        const route = routes[file];
        if (!route) {
            throw new Error("Invald class name.");
        }

        const stats = await fs.stat(require.resolve(route.file));

        if (!route.lastModified || route.lastModified !== stats.mtime) {
            delete require.cache[require.resolve(route.file)];
            route.class = require(route.file);
            route.lastModified = stats.mtime;
        }
    }

    //              #     ##   ##
    //              #    #  #   #
    //  ###   ##   ###   #      #     ###   ###    ###    ##    ###
    // #  #  # ##   #    #      #    #  #  ##     ##     # ##  ##
    //  ##   ##     #    #  #   #    # ##    ##     ##   ##      ##
    // #      ##     ##   ##   ###    # #  ###    ###     ##   ###
    //  ###
    /**
     * Gets all of the available classes.
     * @param {string} dir The directory to get the classes for.
     * @returns {Promise} A promise that resolves when all the classes are retrieved.
     */
    async getClasses(dir) {
        const list = await fs.readdir(dir);

        for (const file of list) {
            const filename = path.resolve(dir, file);

            const stat = await fs.stat(filename);

            if (stat && stat.isDirectory()) {
                await this.getClasses(filename);
            } else {
                const routeClass = require(filename);

                /** @type {RouterBase.Route} */
                const route = routeClass.route;

                routes[filename] = route;
                if (route.webSocket) {
                    routes[filename].events = Object.getOwnPropertyNames(routeClass).filter((p) => typeof routeClass[p] === "function");
                } else if (!route.include) {
                    routes[filename].methods = Object.getOwnPropertyNames(routeClass).filter((p) => typeof routeClass[p] === "function");
                }
                if (route.notFound) {
                    notFoundFilename = filename;
                } else if (route.methodNotAllowed) {
                    methodNotAllowedFilename = filename;
                } else if (route.serverError) {
                    serverErrorFilename = filename;
                }
                routes[filename].file = filename;
                this.checkCache(filename);
            }
        }
    }

    //              #    ###                #
    //              #    #  #               #
    //  ###   ##   ###   #  #   ##   #  #  ###    ##   ###
    // #  #  # ##   #    ###   #  #  #  #   #    # ##  #  #
    //  ##   ##     #    # #   #  #  #  #   #    ##    #
    // #      ##     ##  #  #   ##    ###    ##   ##   #
    //  ###
    /**
     * Gets the router to use for the website.
     * @fires Router#error
     * @param {string} routesPath The directory with the route classes.
     * @param {object} [options] The options to use.
     * @param {boolean} [options.hot] Whether to use hot reloading for RouterBase classes.  Defaults to true.
     * @returns {Promise<Express.Router>} A promise that resolves with the router to use for the website.
     */
    async getRouter(routesPath, options) {
        options = {...{hot: true}, ...options || {}};

        await this.getClasses(routesPath);

        const router = express.Router(),
            filenames = Object.keys(routes),
            includes = filenames.filter((c) => routes[c].include),
            webSockets = filenames.filter((c) => routes[c].webSocket),
            pages = filenames.filter((c) => !routes[c].include && !routes[c].webSocket && routes[c].path && routes[c].methods && routes[c].methods.length > 0);

        // Setup websocket routes.
        webSockets.forEach((filename) => {
            const route = routes[filename];

            router.ws(route.path, (ws, req) => {
                ws.url = req.url.replace("/.websocket", "").replace(".websocket", "") || "/";

                route.events.forEach((event) => {
                    ws.on(event, (...args) => {
                        route.class[event](ws, ...args);
                    });
                });

                ws.emit("init");
            });
        });

        // Setup page routes.
        pages.forEach((filename) => {
            const route = routes[filename];

            route.methods.forEach((method) => {
                router[method](route.path, async (/** @type {Express.Request} */ req, /** @type {Express.Response} */ res, /** @type {function} */ next) => {
                    try {
                        if (options.hot) {
                            for (const include of includes) {
                                await this.checkCache(include);
                            }
                            await this.checkCache(filename);
                        }

                        if (!route.class[req.method.toLowerCase()]) {
                            if (methodNotAllowedFilename !== "") {
                                return routes[methodNotAllowedFilename].class.get(req, res, next);
                            }

                            return res.status(405).send("HTTP 405 Method Not Allowed");
                        }

                        return await route.class[req.method.toLowerCase()](req, res, next);
                    } catch (err) {
                        /**
                         * Error event.
                         * @type {object}
                         * @property {string} message The error message.
                         * @property {Error} err The error object.
                         * @property {Express.Request} req The request.
                         */
                        this.emit("error", {
                            message: `An error occurred in ${req.method.toLowerCase()} ${route.path} from ${req.ip} for ${req.url}.`,
                            err, req
                        });
                    }

                    if (serverErrorFilename !== "") {
                        return routes[serverErrorFilename].class.get(req, res, next);
                    }

                    return res.status(500).send("HTTP 500 Server Error");
                });
            });
        });

        // 404 remaining pages.
        router.use((req, res, next) => {
            if (notFoundFilename !== "") {
                return routes[notFoundFilename].class.get(req, res, next);
            }

            return res.status(404).send("HTTP 404 Not Found");
        });

        // 500 errors.
        router.use((err, req, res, next) => {
            /**
             * Error event.
             * @event Router#error
             * @type {object}
             * @property {string} message The error message.
             * @property {Error} err The error object.
             * @property {Express.Request} req The request.
             */
            this.emit("error", {
                message: "An unhandled error has occurred.",
                err, req
            });

            if (serverErrorFilename !== "") {
                return routes[serverErrorFilename].class.get(req, res, next);
            }

            return res.status(500).send("HTTP 500 Server Error");
        });

        return router;
    }
}

module.exports = Router;
