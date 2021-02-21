/**
 * @typedef {import("./routerBase").Route} RouterBase.Route
 */

//  ####                  #                   ####
//  #   #                 #                    #  #
//  #   #   ###   #   #  ####    ###   # ##    #  #   ###    ###    ###
//  ####   #   #  #   #   #     #   #  ##  #   ###       #  #      #   #
//  # #    #   #  #   #   #     #####  #       #  #   ####   ###   #####
//  #  #   #   #  #  ##   #  #  #      #       #  #  #   #      #  #
//  #   #   ###    ## #    ##    ###   #      ####    ####  ####    ###
/**
 * The base class for a router class.
 * @abstract
 */
class RouterBase {
    //                    #
    //                    #
    // ###    ##   #  #  ###    ##
    // #  #  #  #  #  #   #    # ##
    // #     #  #  #  #   #    ##
    // #      ##    ###    ##   ##
    /**
     * Retrieves the route parameters for the class.
     * @abstract
     * @returns {RouterBase.Route} The route parameters.
     */
    static get route() {
        if (!Object.prototype.hasOwnProperty.call(this, "route")) {
            throw new Error(`You must implement the route property for ${this.name}.`);
        }

        return {
            file: "",
            lastModified: new Date(1970, 0, 1),
            include: false,
            webSocket: false,
            events: [],
            methods: [],
            notFound: false,
            methodNotAllowed: false,
            serverError: false
        };
    }
}

module.exports = RouterBase;
