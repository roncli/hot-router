const createHttpError = require("http-errors");
const ErrorRoute = require("./errors/errorRoute");
const fs = require("fs/promises");
const request = require("supertest");
const Router = require("../router");
const WebSocket = require("ws");
const WebSocketExpress = require("websocket-express");

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 60);
}

// MARK: Router
describe("Router", () => {
    test("should be defined", () => {
        expect(Router).toBeDefined();
    });

    // MARK: Route Integration Tests
    describe("Route Integration Tests", () => {
        /** @type {WebSocketExpress.WebSocketExpress} */
        let app;

        let server;
        let error;
        let addListener;

        beforeEach(async () => {
            error = void 0;
            addListener = false;

            app = new WebSocketExpress.WebSocketExpress();

            const router = new Router();
            router.on("error", (data) => {
                error = data;
            });
            router.addListener("error", () => {
                addListener = true;
            });
            app.use("/", await router.getRouter("./tests/routes", {hot: false}));

            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });

            server = app.listen(3000);
        });

        test("should handle /sample with SampleRoute", async () => {
            const response = await request(server).get("/sample");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Sample route response");
        });

        test("should 404 for unknown route", async () => {
            const response = await request(server).get("/unknown");
            expect(response.status).toBe(404);
            expect(response.text).toBe("HTTP 404 Not Found");
        });

        test("should 405 for post to /sample", async () => {
            const response = await request(server).post("/sample");
            expect(response.status).toBe(405);
            expect(response.text).toBe("HTTP 405 Method Not Allowed");
        });

        test("should handle /fail with FailRoute", async () => {
            const response = await request(server).get("/fail");
            expect(response.status).toBe(500);
            expect(response.text).toBe("HTTP 500 Server Error");
            expect(error?.message).toBe("An error occurred in get /fail for /fail.");
            expect(error?.err?.message).toBe("Intentional error for testing purposes");
            expect(addListener).toBe(true);
        });

        test("should handle /nextError with NextErrorRoute", async () => {
            const response = await request(server).get("/nextError");
            expect(response.status).toBe(500);
            expect(response.text).toBe("HTTP 500 Server Error");
            expect(error?.message).toBe("An unhandled error has occurred.");
            expect(error?.err?.message).toBe("Intentional error for testing purposes passed to middleware");
            expect(addListener).toBe(true);
        });

        test("should handle /nextErrorWithStatus with nextErrorWithStatus", async () => {
            const response = await request(server).get("/nextErrorWithStatus");
            expect(response.status).toBe(503);
            expect(response.text).toBe("Intentional error for testing purposes passed to middleware");
            expect(error).toBeUndefined();
            expect(addListener).toBe(false);
        });

        test("should handle /ws with WsRoute", async () => {
            const ws = new WebSocket("ws://localhost:3000/ws");

            const msg = await new Promise((resolve) => {
                ws.on("message", (message) => {
                    resolve(message);
                });

                ws.on("error", (err) => {
                    resolve(err);
                });
            });

            ws.close();

            expect(msg.toString()).toBe("WebSocket connection established");
            expect(addListener).toBe(false);
        });

        test("should handle missing route with ErrorRoute", () => {
            expect(() => ErrorRoute.route).toThrow("You must implement the route property for ErrorRoute.");
        });

        test("should handle regex route", async () => {
            const response = await request(server).get("/this/is/a/directory/");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Directory route response: /this/is/a/directory/");
            expect(error).toBeUndefined();
            expect(addListener).toBe(false);
        });

        afterEach(async () => {
            await server.close();
        });
    });

    // MARK: Error Handling
    describe("Error Handling", () => {
        /** @type {WebSocketExpress.WebSocketExpress} */
        let app;

        let server;

        beforeEach(() => {
            app = new WebSocketExpress.WebSocketExpress();

            const router = new Router();

            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });

            server = app.listen(3000);
        });

        test("should call router.error when an error occurs", async () => {
            const router = new Router();
            const errorSpy = jest.spyOn(router, "error"); // Spy on the error method

            let error = void 0;
            router.on("error", (data) => {
                error = data;
            });

            // Trigger an error
            app.get("/triggerError", (req, res, next) => {
                next(new Error("Test error"));
            });

            // Simulate an error middleware
            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });

            const response = await request(server).get("/triggerError");

            // Assert that the error method was called
            expect(errorSpy).toHaveBeenCalled();
            expect(errorSpy.mock.calls[0][0].message).toBe("Test error");
            expect(response.status).toBe(500);
            expect(response.text).toBe("HTTP 500 Server Error");
            expect(error?.message).toBe("An unhandled error has occurred.");
            expect(error?.err?.message).toBe("Test error");

            errorSpy.mockRestore(); // Restore the original method
        });

        test("should call router.error when an error with custom status occurs", async () => {
            const router = new Router();
            const errorSpy = jest.spyOn(router, "error"); // Spy on the error method

            let error = void 0;
            router.on("error", (data) => {
                error = data;
            });

            // Trigger an error
            app.get("/triggerError", (req, res, next) => {
                const err = createHttpError(503, "Test error");
                err.expose = true;
                next(err);
            });

            // Simulate an error middleware
            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });

            const response = await request(server).get("/triggerError");

            // Assert that the error method was called
            expect(errorSpy).toHaveBeenCalled();
            expect(errorSpy.mock.calls[0][0].message).toBe("Test error");
            expect(response.status).toBe(503);
            expect(response.text).toBe("Test error");
            expect(error).toBeUndefined();

            errorSpy.mockRestore(); // Restore the original method
        });

        test("should call router.error when an error with custom status occurs when headers have already been sent", async () => {
            const router = new Router();
            const errorSpy = jest.spyOn(router, "error"); // Spy on the error method

            let error = void 0;
            router.on("error", (data) => {
                error = data;
            });

            // Trigger an error
            app.get("/triggerError", (req, res, next) => {
                res.write("Headers already sent.");
                const err = createHttpError(503, "Test error");
                err.expose = true;
                next(err);
            });

            // Simulate an error middleware
            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });

            const response = await request(server).get("/triggerError");

            // Assert that the error method was called
            expect(errorSpy).toHaveBeenCalled();
            expect(errorSpy.mock.calls[0][0].message).toBe("Test error");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Headers already sent.");
            expect(error).toBeUndefined();

            errorSpy.mockRestore(); // Restore the original method
        });

        afterEach(async () => {
            await server.close();
        });
    });

    // MARK: Hot Reloading
    describe("Hot Reloading", () => {
        /** @type {WebSocketExpress.WebSocketExpress} */
        let app;

        let server;

        beforeEach(async () => {
            app = new WebSocketExpress.WebSocketExpress();

            const router = new Router();
            app.use("/", await router.getRouter("./tests/routes", {hot: true}));

            server = app.listen(3000);
        });

        test("should handle hot reloading with SampleRoute", async () => {
            const response = await request(server).get("/sample");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Sample route response");

            const path = "./tests/routes/sampleRoute.js";
            const content = await fs.readFile(path, "utf8");
            await fs.writeFile(path, content, "utf8");

            const response2 = await request(server).get("/sample");
            expect(response2.status).toBe(200);
            expect(response2.text).toBe("Sample route response");
        });

        afterEach(async () => {
            await server.close();
        });
    });

    // MARK: Catch All Routes
    describe("Catch All Routes", () => {
        /** @type {WebSocketExpress.WebSocketExpress} */
        let app;

        let server;

        beforeEach(async () => {
            app = new WebSocketExpress.WebSocketExpress();

            const router = new Router();

            app.use("/", await router.getRouter("./tests/catchAll", {hot: false}));

            server = app.listen(3000);
        });

        test("should handle /sample route", async () => {
            const response = await request(server).get("/sample");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Sample route response");
        });

        test("should handle /catchAll route", async () => {
            const response = await request(server).get("/catchAll");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Catch all route response, path: /catchAll");
        });

        test("should 404 the /404 route", async () => {
            const response = await request(server).get("/404");
            expect(response.status).toBe(404);
            expect(response.text).toBe("HTTP 404 Not Found");
        });

        afterEach(async () => {
            await server.close();
        });
    });

    // MARK: Custom Errors
    describe("Custom Errors", () => {
        /** @type {WebSocketExpress.WebSocketExpress} */
        let app;

        let server;
        let error;

        beforeEach(async () => {
            error = void 0;

            app = new WebSocketExpress.WebSocketExpress();

            const router = new Router();

            router.on("error", (data) => {
                error = data;
            });

            app.use("/", await router.getRouter("./tests/customErrors", {hot: false}));

            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });

            server = app.listen(3000);
        });

        test("should handle custom /customSample route", async () => {
            const response = await request(server).get("/customSample");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Sample route response");
        });

        test("should handle custom 404 error", async () => {
            const response = await request(server).get("/unknown");
            expect(response.status).toBe(404);
            expect(response.text).toBe("Intentional 404 error for testing purposes");
        });

        test("should handle custom 405 error", async () => {
            const response = await request(server).post("/customSample");
            expect(response.status).toBe(405);
            expect(response.text).toBe("Intentional 405 error for testing purposes");
        });

        test("should handle custom 500 error", async () => {
            const response = await request(server).get("/customFail");
            expect(response.status).toBe(500);
            expect(response.text).toBe("Intentional 500 error for testing purposes");
            expect(error?.message).toBe("An error occurred in get /customFail for /customFail.");
            expect(error?.err?.message).toBe("Intentional error for testing purposes");
        });

        afterEach(async () => {
            await server.close();
        });
    });

    // MARK: Headers Already Sent
    describe("Headers Already Sent", () => {
        /** @type {WebSocketExpress.WebSocketExpress} */
        let app;

        let server;
        let error;

        beforeEach(async () => {
            error = void 0;

            app = new WebSocketExpress.WebSocketExpress();

            const router = new Router();

            router.on("error", (data) => {
                error = data;
            });

            app.use((req, res, next) => {
                res.write("Headers already sent error occurred.");
                next();
            });

            app.use("/", await router.getRouter("./tests/routes", {hot: false}));

            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });

            server = app.listen(3000);
        });

        test("should handle headers already sent error", async () => {
            const response = await request(server).get("/headers");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Headers already sent error occurred.");
            expect(error?.message).toBe("An unhandled error has occurred.");
            expect(error?.err?.message).toBe("Headers already sent.");
        });

        test("should handle 404 when headers have already been sent", async () => {
            const response = await request(server).get("/not-found");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Headers already sent error occurred.");
            expect(error).toBeUndefined();
        });

        afterEach(async () => {
            await server.close();
        });
    });
});
