import cloudFlareEdgeProxy from "../src";

const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");

describe("Service worker", () => {
    beforeEach(() => {
        Object.assign(global, makeServiceWorkerEnv(), makeFetchMock());
        jest.resetModules();
    });

    it("should attach the listeners", () => {
        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });
        expect(Object.keys(self.listeners)).toEqual(["fetch"]);
    });

    it("should respond with proxied request", async () => {
        // set up config
        const proxy = cloudFlareEdgeProxy({
            abtest: true,
            origins: [{ url: "https://example.com" }],
            salt: "test-abc-123"
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        global.fetch = () =>
            Promise.resolve({
                body: { parts: ["Hello World"], type: "" },
                bodyUsed: false,
                headers,
                ok: true,
                redirected: false,
                status: 200,
                statusText: "OK",
                type: "basic",
                url: "http://example.com/asset"
            });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const request = new Request("/test");
        const response = await self.trigger("fetch", request);

        expect({
            ...response,
            headers: [...response.headers._map]
        }).toEqual({
            body: { parts: ["Hello World"], type: "" },
            bodyUsed: false,
            headers: [["Content-Type", "text/html"]],
            ok: true,
            redirected: false,
            status: 200,
            statusText: "OK",
            type: "basic",
            url: "http://example.com/asset"
        });
    });
});
