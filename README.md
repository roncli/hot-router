# hot-router
A router for Express that lets you set up route classes to easily create routes.  For development, it can also be set up to hot swap the code inside your route classes while your application is running.

## Prerequisites
hot-router is designed to work with Express, so Express is required in your project.  You may also optionally install websocket-express if you wish to use hot-router with web sockets in Express.

## Installing
Use npm to install.

```
npm install hot-router
```

If you are using websocket-express, you will need to install all of these dependencies as well.

```
npm install websocket-express ws @types/express @types/ws
```

## Usage
To use hot-router, there are two steps.  First, you must hook up hot-router as a router in Express, pointing at the directory that will contain your routes.  Second, you need to create route classes for hot-router to use.

### Quick Setup

#### index.js
```javascript
// Require path from node.js.
const path = require("path");

// Require express.
const express = require("express");

// Require hot-router.
const HotRouter = require("hot-router");

// Create a new Express app.
const app = express();

// Create a new router object.
const router = new HotRouter.Router();

// Listen to error events.
router.on("error", (data) => {
    console.log(`There was an error with one of the routes!  hot-router message: ${data.message}  error message: ${data.err.message}  request path: ${data.req.path}`);
});

(async () => {
    // Use the router with Express.
    try {
        app.use(
            "/",

            // The parameter is the absolute path of the directory that will contain the route classes.
            await router.getRouter(path.join(__dirname, "web"))
        );
    } catch (err) {
        console.log(`There was an error setting up the routes!  error message: ${err.message}`);
    }

    // Catch-all error handler.
    app.use((err, req, res, next) => {
        router.error(err, req, res, next);
    });

    // Start Express.
    app.listen(process.env.PORT || 3030);
}());
```

#### web/home.js
```javascript
// Require hot-router.
const HotRouter = require("hot-router");

// Define the class.
class Home extends HotRouter.RouterBase {

    // Set up the route.
    static get route() {

        // Get the default route from the base class.
        const route = {...super.route};

        // Modify the base route as needed.
        route.path = "/";

        // Return the route.
        return route;
    }

    // Set up the GET method.
    static get(req, res, next) {

        // Return the response.
        res.status(200).send("<html><body>Welcome to hot-router!</body></html>");
    }
}

// Export the class.
module.exports = Home;
```

### Router class
The Router class provides the Express router to use with your app.

#### Constructor
The constructor has no parameters.

```javascript
const router = new HotRouter.Router();
```

#### Getting the Router for Express
To get the route, you call the `getRouter()` method of the `router` object.  This call takes these parameters.

| Parameter | Type | Description |
|---|---|---|
| **path** | _string_ | The absolute path to the directory containing the route classes. |
| **options** | _object_ | _Optional._  The options to use. |
| **options.hot** | _boolean_ | _Optional._  Defaults to false.  Whether to use hot routes.  Hot routes allow you to change code in the route while your application is running at the cost of a small memory leak every time a route is updated.  **Therefore, this is not recommended to be set to `true` in production environments.**  Note that this only applies to routes that existed when you started the application.  You still will need to restart your application to add or remove any route classes. |

##### Returns
_Promise<Express.Router>_ - A promise with an Express router object that you can plug into Express.

```javascript
const router = new HotRouter.Router();

app.use(
    "/",
    await router.getRouter(path.join(__dirname, "web"), {hot: true})
);

app.use((err, req, res, next) => {
    router.error(err, req, res, next);
});
```

#### Events
There is one event, the `error` event.  The event returns an object that has these properties.

| Property | Type | Description |
|---|---|---|
| **message** | _string_ | The error message describing what action hot-router was taking when the error occurred. |
| **err** | _error_ | The error object.  This is the error that triggered the event. |
| **req** | _Express.Request_ | The request object.  This is the request that caused the error. |

```javascript
const router = new HotRouter.Router();
router.on("error", (data) => {
    const {message, err, req} = data;
});
```

### RouterBase class
The RouterBase class is a static class that provides a framework with which you can easily create classes to handle your route classes.  To create your route class, you simply need to extend from the RouterBase class, set up your route, and create static methods to handle the HTTP methods you want to handle.

```javascript
class Home extends HotRouter.RouterBase {
}
```

#### RouterBase.route property
Customize your route by extending the RouterBase class's route property.  The easiest way to do this is by retrieving the base class's route property and customizing it for your needs.  The route property is an object with these properties.

| Property | Type | Default | Description |
|---|---|---|---|
| path | _string \| RegExp_ | `undefined` | The route path.  This follows the normal Express syntax for routes, allowing you to take advantage of parameters via the `req.params` object within your route methods. |
| include | _boolean_ | `false` | Marks the file as one that is included with every request.  Instead of methods for HTTP methods, you can create whatever methods you need and `require` this class in your other route classes.  This is useful for a class that other route classes need to call for common functionality, for instance to have a template for your web pages. |
| catchAll | _boolean_ | `false` | Marks the file as one that handles any requests that don't match your other routes.  Don't use this for 404 errors, set `notFound` instead.  If you set this and need to send a 404, you can call `next(); return;` in your `catchAll` route to trigger the 404. |
| webSocket | _boolean_ | `false` | Marks the file as one that handles web sockets.  Instead of methods for HTTP methods, you create methods for web socket events. |
| notFound | _boolean_ | `false` | Marks the file as one that handles HTTP 404 Not Found requests.  This is called when no routes match.  Useful for overriding the default 404 web page. |
| methodNotAllowed | _boolean_ | `false` | Marks the file as one that handles HTTP 405 Method Not Allowed requests.  This is called when an HTTP method is used with a route class that does not have that method defined as a function.  Useful for overriding the default 405 web page. |
| serverError | _boolean_ | `false` | Marks the file as one that handles HTTP 500 Server Error requests.  This is called when something within node.js throws an error before it can successfully handle a request.  Useful for overriding the default 500 web page. |
| middleware | _RequestHandler[] \| WSRequestHandler[]_ | `[]` | An array of middleware that will apply only to this route. Can handle both express and websocket-express middleware, depending on the value of `webSocket`. |

You should only ever need to define at most *one* of the properties of `path`, `include`, `notFound`, `methodNotAllowed`, and `serverError`, with one exception: you need to define both `path` and `webSocket` to create a web socket route class.  There are other properties on the default route object that are not listed here, which should be considered internal properties.

Overriding the route is required in any class that extends from `RouterBase`.  To override the route property, use the following example:
```javascript
class Home extends HotRouter.RouterBase {
    static get route() {
        const route = {...super.route};
        route.path = "/";
        return route;
    }
}
```

The first line of the function gets a copy of the default route with the above properties.  The last line of the function returns the route.  In between are the lines where you define one of the route's properties.

In this case, we have created a route for the top level page of the website, `/`.  That path can be anything, and you can use parameters, which will be available on any `Express.Request` object's `params` property.  For instance, a route path of `/user/:id` will match a uri of `/user/1` and then populate `req.params.id` with the string `"1"`.

#### Basic Route Class
A basic route class will override the path property and define one or more static methods that are the same as HTTP methods, only in lower case.

This example requires the use of `app.use(express.urlencoded({extended: true}));` when starting up Express.

```javascript
class Login extends HotRouter.RouterBase {
    static get route() {
        const route = {...super.route};
        route.path = "/login";
        return route;
    }

    static get(req, res, next) {
        res.status(200).send(`
            <html>
                <body>
                    <form action="/login" method="POST">
                        Username: <input type="text" name="username" /><br />
                        Password: <input type="password" name="password" /><br />
                        <input type="submit" value="Login" />
                    </form>
                </body>
            </html>
        `);
    }

    static async post(req, res, next) {
        if (await Users.login(req.body.username, req.body.password)) {
            res.redirect("/members-only");
            return;
        }

        res.status(200).send(`
            <html>
                <body>
                    <form action="/login" method="POST">
                        Invalid log in, try again.<br />
                        Username: <input type="text" name="username" /><br />
                        Password: <input type="password" name="password" /><br />
                        <input type="submit" value="Login" />
                    </form>
                </body>
            </html>
        `);
    }
}
```

You'll notice that in this example, the `post` method uses the `async` keyword.  You can use asynchronous functions for any of the HTTP methods if you will be using the async/await pattern.  Alternatively, you can return a Promise from any HTTP method function if you use the promises pattern instead.

You are not just limited to HTTP GET and HTTP POST methods.  Any manner of HTTP methods can be used, even those that don't exist.  Any static method on this class will be called if a request is received that matches the route's `path`, and the HTTP method of the request, when lower cased, matches the name of the static method in the class.

#### Include Route Class
An include route class is useful if you call it from most or all of your basic route classes.  This commonly is used to do things like give your web pages the same look and feel, include the same CSS or JavaScript files, or do things that are common to every web page that calls it.  While it is not necessary to use include route classes, it is very helpful if you have turned on `hot` routes, because then changes to this file will be processed without you having to restart your node.js program.

This example uses an include class called `MasterPage` to create a menu, and we will see the `Home` class use the `MasterPage` class to implement it.

##### masterPage.js
```javascript
class MasterPage extends HotRouter.RouterBase {
    static get route() {
        const route = {...super.route};
        route.include = true;
        return route;
    }

    static get page(html) {
        return `
            <html>
                <head>
                    <link rel="stylesheet" href="/css/site.css" />
                    <script src="/js/site.js"></script>
                </head>
                <body>
                    Welcome to the web site!<br />
                    <a href="/">Home</a> - <a href="/links">Links</a> - <a href="/about">About</a>
                    ${html}
                </body>
            </html>
        `;
    }
}
```

##### home.js
```javascript
class MasterPage extends HotRouter.Home {
    static get route() {
        const route = {...super.route};
        route.path = "/";
        return route;
    }

    static get(req, res, next) {
        res.status(200).send(
            Common.page(`
                <div>The current server time is ${new Date()}.  Select a menu option above to continue.</div>
            `);
        );
    }
}
```

#### Web Socket Route Class
When used in conjunction with websocket-express, you can use hot-router to create web socket route classes.  Instead of overriding HTTP methods, you instead are overriding web socket events.  Since websocket-express is based on the ws library, you can view the server events available, and thus the parameters to the methods you will need, at [https://github.com/websockets/ws/blob/master/doc/ws.md](https://github.com/websockets/ws/blob/master/doc/ws.md).  The most common events you will use are `connection` and `close`.

Here is an example of a simple websocket setup that gives your app a static function that will broadcast to all currently connected websocket users.  This example requires that websocket-express is setup prior to getting the Express router from hot-router.

##### ws.js
```javascript
const clients = [];

class WS {
    static broadcast(message) {
        const str = JSON.stringify(message);

        clients.forEach((client) => {
            if (client.readyState !== 1) {
                return;
            }

            client.send(str);
        });
    }

    static register(ws) {
        clients.push(ws);
    }

    static unregister(ws) {
        clients.splice(clients.indexOf(ws), 1);
    }
}
```

##### homeWS.js
```javascript
class HomeWS extends HotRouter.Home {
    static get route() {
        const route = {...super.route};
        route.path = "/";
        route.webSocket = true;
        return route;
    }

    static connection(ws, message) {
        WS.register(ws);
    }

    static close(ws) {
        WS.unregister(ws);
    }
}
```

#### Error Pages
hot-router provides default error pages for HTTP 404 Not Found, HTTP 405 Method Not Allowed, and HTTP 500 Server Error pages.  You can override these in the route by setting the corresponding property to true.  You do not need to give any of these pages a path.

Here is an example of a custom 404 page.

```javascript
class NotFound extends HotRouter.Home {
    static get route() {
        const route = {...super.route};
        route.notFound = true;
        return route;
    }

    static get(req, res, next) {
        res.status(404).send(`
            <html>
                <body>
                    Whoops!  You requested a page that doesn't exist!  Sorry about that.
                </body>
            </html>
        `);
    }
}
```

## Versions

### v2.0.0 Beta 6 - 10/5/2025
* Fix bug with HEAD request not working correctly when there is no HEAD method defined in the route class.

### v2.0.0 Beta 5 - 10/5/2025
* Better fix for the HEAD request.
* Package updates.

### v2.0.0 Beta 4 - 9/24/2025
* Require node.js 18.
* Updated error messages to remove IP addresses and change the order of the path and URL to make more sense.
* Fix incorrect error when headers are already sent.
* Fix a crash due to Express calling GET when HEAD is requested.
* Package updates.

### v2.0.0 Beta 3 - 4/6/2025
* Add a `catchAll` option for routes that handles anything that doesn't match other routes.

### v2.0.0 Beta 2 - 4/6/2025
* Allow `RegExp` objects for a `Route`'s `path`.

### v2.0.0 Beta 1 - 4/5/2025
* Upgrade to `express` v5.
* Replace `express-ws` with `websocket-express`, which supports `express` v5.
* Removed some internals of `RouterBase` from the default `route` property.
* Implement basic 404 (4404) and 500 (1011) websocket routes.

### v1.0.4 - 3/29/2025
* Improve typings.
* Add `jest` unit tests.
* Package updates.

### v1.0.3 - 8/6/2024
* Package updates.

### v1.0.2 - 7/14/2023
* Fix bug with web socket `connection` event.

### v1.0.1 - 10/25/2022
* Package updates.

### v1.0.0 - 8/3/2022
* Hot routing is now disabled by default, you must set the `hot` option to `true` in `getRouter()` in order to enable hot routing.  **Hot routing is not intended for production use.**
* Package updates.

### v1.0.0 Beta 10 - 5/21/2022
* Package updates.

### v1.0.0 Beta 9 - 3/8/2022
* Package updates.

### v1.0.0 Beta 8 - 9/21/2021
* Do not process any routes if headers were already sent.

### v1.0.0 Beta 7 - 8/31/2021
* Allow for middleware to be defined at the route level.

### v1.0.0 Beta 6 - 8/30/2021
* Package updates.

### v1.0.0 Beta 5 - 3/20/2021
* Pass through more HTTP errors from Express.

### v1.0.0 Beta 4 - 3/20/2021
* Pass through most HTTP errors from Express.

### v1.0.0 Beta 3 - 2/25/2021
* Fixed asynchronous issues.
* Added error handler to be used with Express's catch-all error handler.

### v1.0.0 Beta 2 - 2/24/2021
* Fixed bug with hot route classes always reloading themselves, even if there wasn't a change with the file.

### v1.0.0 Beta 1 - 2/22/2021
* Initial version.
