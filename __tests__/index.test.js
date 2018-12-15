import cloudFlareEdgeProxy from "../src";

const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");

jest.mock("uuid/v4", () => jest.fn(() => "mock-uuid"));

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

    it("should respond with proxied request for a/b test", async () => {
        // set up config
        const proxy = cloudFlareEdgeProxy({
            abtest: true,
            origins: [
                { url: "https://a.com" },
                { url: "https://b.com" },
                { url: "https://c.com" }
            ],
            salt: "test-abc-123"
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: {
                    parts: [
                        e.url === "https://a.com"
                            ? "A"
                            : e.url === "https://b.com"
                                ? "B"
                                : "C"
                    ],
                    type: ""
                },
                bodyUsed: false,
                headers,
                ok: true,
                redirected: false,
                status: 200,
                statusText: "OK",
                type: "basic"
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const request = new Request("/test");
        const response = await self.trigger("fetch", request);

        // expect a response to be received
        expect({
            ...response,
            headers: [...response.headers._map]
        }).toEqual({
            body: { parts: ["C"], type: "" },
            bodyUsed: false,
            headers: [["Content-Type", "text/html"]],
            ok: true,
            redirected: false,
            status: 200,
            statusText: "OK",
            type: "basic"
        });

        // assert the proper origin was called and also it was passed the request-id
        expect({
            ...global.fetch.mock.calls[0][0],
            headers: [...global.fetch.mock.calls[0][0].headers._map]
        }).toEqual({
            body: { parts: [undefined], type: "" },
            bodyUsed: false,
            headers: [["accept", "*/*"], ["request-id", "mock-uuid"]],
            method: "GET",
            mode: "same-origin",
            url: "https://c.com/test"
        });
    });
});
