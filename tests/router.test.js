const createHttpError = require("http-errors");
const ErrorRoute = require("./errors/errorRoute");
const express = require("express");
const expressWs = require("express-ws");
const fs = require("fs/promises");
const request = require("supertest");
const Router = require("../router");
const WebSocket = require("ws");

describe("Router", () => {
    test("should be defined", () => {
        expect(Router).toBeDefined();
    });

    describe("getRouter", () => {
        test("should return an ExpressWs router instance", async () => {
            const app = express();

            // Patch the app with express-ws
            expressWs(app);

            const router = new Router();
            const expressRouter = await router.getRouter("./tests/routes", {hot: false});

            // Check for core Express router methods
            expect(typeof expressRouter.use).toBe("function");
            expect(typeof expressRouter.get).toBe("function");
            expect(typeof expressRouter.post).toBe("function");
            expect(typeof expressRouter.put).toBe("function");
            expect(typeof expressRouter.delete).toBe("function");
            expect(typeof expressRouter.patch).toBe("function");
            expect(typeof expressRouter.all).toBe("function");
            expect(typeof expressRouter.param).toBe("function");

            // Check for express-ws-specific methods
            expect(typeof expressRouter.ws).toBe("function");
        });
    });

    describe("Route Integration Tests", () => {
        let app;
        let error;
        let addListener;

        beforeEach(async () => {
            error = void 0;
            addListener = true;

            app = express();
            expressWs(app);

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
        });

        test("should handle /sample with SampleRoute", async () => {
            const response = await request(app).get("/sample");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Sample route response");
        });

        test("should 404 for unknown route", async () => {
            const response = await request(app).get("/unknown");
            expect(response.status).toBe(404);
            expect(response.text).toBe("HTTP 404 Not Found");
        });

        test("should 405 for post to /sample", async () => {
            const response = await request(app).post("/sample");
            expect(response.status).toBe(405);
            expect(response.text).toBe("HTTP 405 Method Not Allowed");
        });

        test("should handle /fail with FailRoute", async () => {
            const ip = "12.34.56.78";
            app.set("trust proxy", true);
            const response = await request(app).get("/fail").set("X-Forwarded-For", ip);
            expect(response.status).toBe(500);
            expect(response.text).toBe("HTTP 500 Server Error");
            expect(error?.message).toBe(`An error occurred in get /fail from ${ip} for /fail.`);
            expect(error?.err?.message).toBe("Intentional error for testing purposes");
        });

        test("should handle /nextError with NextErrorRoute", async () => {
            const response = await request(app).get("/nextError");
            expect(response.status).toBe(500);
            expect(response.text).toBe("HTTP 500 Server Error");
            expect(error?.message).toBe("An unhandled error has occurred.");
            expect(error?.err?.message).toBe("Intentional error for testing purposes passed to middleware");
        });

        test("should handle /nextErrorWithStatus with nextErrorWithStatus", async () => {
            const response = await request(app).get("/nextErrorWithStatus");
            expect(response.status).toBe(503);
            expect(response.text).toBe("Intentional error for testing purposes passed to middleware");
            expect(error).toBeUndefined();
        });

        test("should handle /ws with WsRoute", () => {
            const server = app.listen(3000);
            const ws = new WebSocket("ws://localhost:3000/ws");
            ws.on("message", async (message) => {
                expect(message).toBe("WebSocket connection established");
                expect(addListener).toBe(true);
                ws.close();
                await server.close();
            });
        });

        test("should handle missing route with ErrorRoute", () => {
            expect(() => {
                app.get(ErrorRoute.route);
            }).toThrow("You must implement the route property for ErrorRoute.");
        });
    });

    describe("Error Handling", () => {
        let app;

        beforeEach(() => {
            app = express();
            expressWs(app);

            const router = new Router();

            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });
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

            const response = await request(app).get("/triggerError");

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

            const response = await request(app).get("/triggerError");

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

            const response = await request(app).get("/triggerError");

            // Assert that the error method was called
            expect(errorSpy).toHaveBeenCalled();
            expect(errorSpy.mock.calls[0][0].message).toBe("Test error");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Headers already sent.");
            expect(error).toBeUndefined();

            errorSpy.mockRestore(); // Restore the original method
        });
    });

    describe("Hot Reloading", () => {
        let app;

        beforeEach(async () => {
            app = express();
            expressWs(app);

            const router = new Router();
            app.use("/", await router.getRouter("./tests/routes", {hot: true}));
        });

        test("should handle hot reloading with SampleRoute", async () => {
            const response = await request(app).get("/sample");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Sample route response");

            const path = "./tests/routes/sampleRoute.js";
            const content = await fs.readFile(path, "utf8");
            await fs.writeFile(path, content, "utf8");

            const response2 = await request(app).get("/sample");
            expect(response2.status).toBe(200);
            expect(response2.text).toBe("Sample route response");
        });
    });

    describe("Custom Errors", () => {
        let app;
        let error;

        beforeEach(async () => {
            error = void 0;

            app = express();
            expressWs(app);

            const router = new Router();

            router.on("error", (data) => {
                error = data;
            });

            app.use("/", await router.getRouter("./tests/customErrors", {hot: false}));

            app.use((err, req, res, next) => {
                router.error(err, req, res, next);
            });
        });

        test("should handle custom /customSample route", async () => {
            const response = await request(app).get("/customSample");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Sample route response");
        });

        test("should handle custom 404 error", async () => {
            const response = await request(app).get("/unknown");
            expect(response.status).toBe(404);
            expect(response.text).toBe("Intentional 404 error for testing purposes");
        });

        test("should handle custom 405 error", async () => {
            const response = await request(app).post("/customSample");
            expect(response.status).toBe(405);
            expect(response.text).toBe("Intentional 405 error for testing purposes");
        });

        test("should handle custom 500 error", async () => {
            const ip = "12.34.56.78";
            app.set("trust proxy", true);
            const response = await request(app).get("/customFail").set("X-Forwarded-For", ip);
            expect(response.status).toBe(500);
            expect(response.text).toBe("Intentional 500 error for testing purposes");
            expect(error?.message).toBe(`An error occurred in get /customFail from ${ip} for /customFail.`);
            expect(error?.err?.message).toBe("Intentional error for testing purposes");
        });
    });

    describe("Headers already sent", () => {
        let app;
        let error;

        beforeEach(async () => {
            error = void 0;

            app = express();
            expressWs(app);

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
        });

        test("should handle headers already sent error", async () => {
            const ip = "12.34.56.78";
            app.set("trust proxy", true);
            const response = await request(app).get("/headers").set("X-Forwarded-For", ip);
            expect(response.status).toBe(200);
            expect(response.text).toBe("Headers already sent error occurred.");
            expect(error?.message).toBe(`An error occurred in get /headers from ${ip} for /headers.`);
            expect(error?.err?.message).toBe("Cannot set headers after they are sent to the client");
        });

        test("should handle 404 when headers have already been sent", async () => {
            const response = await request(app).get("/not-found");
            expect(response.status).toBe(200);
            expect(response.text).toBe("Headers already sent error occurred.");
            expect(error).toBeUndefined();
        });
    });
});
