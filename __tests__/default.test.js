import cloudFlareEdgeProxy from "../src";

const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");

describe("Service worker", () => {
    beforeEach(() => {
        Object.assign(global, makeServiceWorkerEnv(), makeFetchMock());
        jest.resetModules();
    });

    it("should equally (approximately) balance assignment", async () => {
        // set up config
        const proxy = cloudFlareEdgeProxy({
            defaultBackend: "https://default-backend.com"
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: {
                    parts: [
                        e.url === "https://default-backend.com/test"
                            ? "default"
                            : null
                    ]
                }
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        const request = new Request("/test");

        await Promise.all(
            Array.apply(null, { length: 100 }).map(() => {
                return self.trigger("fetch", request);
            })
        ).then(data => {
            const responses = data.map(item => item.body.parts[0]);
            expect(responses.filter(x => x === "default").length).toBe(100);
        });
    });
});
