import cloudFlareEdgeProxy from "../src";
const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");
const jwttoken = require("jsonwebtoken");

describe("Gatekeeping", () => {
    beforeEach(() => {
        Object.assign(global, makeServiceWorkerEnv(), makeFetchMock());
        jest.resetModules();
    });

    it("should allow proper gatekeeping token access (query string)", async () => {
        // set up config
        const JWT_SECRET_KEY = "ABC_123";
        const proxy = cloudFlareEdgeProxy({
            defaultBackend: "https://default-backend.com",
            JWT_SECRET_KEY
        });

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: {
                    parts: ["Dev Backend"]
                }
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const url = "http://200.200.200.200:8080";
        const devToken = jwttoken.sign(
            {
                url
            },
            JWT_SECRET_KEY
        );

        const request = new Request(`/test?devtoken=${devToken}`);
        const result = await self.trigger("fetch", request);

        expect(result).toEqual({ body: { parts: ["Dev Backend"] } });
        expect(global.fetch.mock.calls[0][0].url).toBe(
            `${url}/test?devtoken=${devToken}`
        );
    });

    it("should set token from query string into cookie, if config.setGatekeepingCookie === true", async () => {
        // set up config
        const JWT_SECRET_KEY = "ABC_123";
        const proxy = cloudFlareEdgeProxy({
            defaultBackend: "https://default-backend.com",
            JWT_SECRET_KEY,
            setGatekeepingCookie: true
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: "Dev Backend",
                headers,
                status: 200,
                statusText: "OK"
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const url = "http://200.200.200.200:8080";
        const devToken = jwttoken.sign(
            {
                url
            },
            JWT_SECRET_KEY
        );

        const request = new Request(`/test?devtoken=${devToken}`);
        const result = await self.trigger("fetch", request);

        expect([...result.headers._map]).toEqual([
            ["Content-Type", "text/html"],
            ["Set-Cookie", `devtoken=${devToken}; Max-Age=86400; HttpOnly`]
        ]);
        expect(global.fetch.mock.calls[0][0].url).toBe(
            `${url}/test?devtoken=${devToken}`
        );
    });

    it("should allow proper gatekeeping token access (cookie)", async () => {
        // set up config
        const JWT_SECRET_KEY = "ABC_123";
        const proxy = cloudFlareEdgeProxy({
            defaultBackend: "https://default-backend.com",
            JWT_SECRET_KEY
        });

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: {
                    parts: ["Dev Backend"]
                }
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const url = "http://200.200.200.200:8080";
        const devToken = jwttoken.sign(
            {
                url
            },
            JWT_SECRET_KEY
        );

        const headers = new Headers({});
        headers.append("Cookie", `devtoken=${devToken};`);

        const request = new Request(`/test`, { headers });
        const result = await self.trigger("fetch", request);

        expect(result).toEqual({ body: { parts: ["Dev Backend"] } });
        expect(global.fetch.mock.calls[0][0].url).toBe(`${url}/test`);
    });

    it("should return default backend for invalid token", async () => {
        // set up config
        const JWT_SECRET_KEY = "ABC_123";
        const defaultBackend = "https://default-backend.com";
        const proxy = cloudFlareEdgeProxy({
            defaultBackend,
            JWT_SECRET_KEY
        });

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: {
                    parts: ["Default Backend"]
                }
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const url = "http://200.200.200.200:8080";
        const devToken = jwttoken.sign(
            {
                url
            },
            "invalid_secret"
        );

        const request = new Request(`/test?devtoken=${devToken}`);
        const result = await self.trigger("fetch", request);

        expect(result).toEqual({ body: { parts: ["Default Backend"] } });
        expect(global.fetch.mock.calls[0][0].url).toBe(
            `${defaultBackend}/test?devtoken=${devToken}`
        );
    });
});
