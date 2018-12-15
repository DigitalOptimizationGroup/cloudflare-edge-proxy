import cloudFlareEdgeProxy from "../src";

const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");

jest.mock("uuid/v4", () => jest.fn(() => "mock-uuid"));

// this formatting is sensitive because we pretty print the echo response
const expectedResponse = `<pre>{
    "cookies": {},
    "params": {
        "echotoken": "abc-123"
    },
    "pathname": "/echo",
    "headers": [
        "*/*",
        "mock-uuid"
    ]
}</pre>`;

describe("Echo", () => {
    beforeEach(() => {
        Object.assign(global, makeServiceWorkerEnv(), makeFetchMock());
        jest.resetModules();
    });

    it("should return echo response with valid token and path", async () => {
        // set up config
        const echoToken = "abc-123";
        const proxy = cloudFlareEdgeProxy({
            defaultBackend: "https://default-backend.com",
            ECHO_TOKEN: echoToken
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const request = new Request(`/echo?echotoken=${echoToken}`);

        const response = await self.trigger("fetch", request);

        expect(response.body.parts[0]).toEqual(expectedResponse);
    });

    it("should return default backend with /echo path but invalid token", async () => {
        // set up config
        const echoToken = "abc-123";
        const proxy = cloudFlareEdgeProxy({
            defaultBackend: "https://default-backend.com",
            ECHO_TOKEN: echoToken
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

        const request = new Request(`/echo?echotoken=invalid`);

        const response = await self.trigger("fetch", request);

        expect(response.body.parts[0]).toEqual("Default Backend");
        expect(global.fetch.mock.calls.length).toBe(1);
    });
});
