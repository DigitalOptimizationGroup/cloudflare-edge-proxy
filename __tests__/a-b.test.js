import cloudFlareEdgeProxy from "../src";

const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");

describe("A/B/N Testing", () => {
    beforeEach(() => {
        Object.assign(global, makeServiceWorkerEnv(), makeFetchMock());
        jest.resetModules();
    });

    it("should equally (approximately) balance assignment", async () => {
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
                        e.url === "https://a.com/test"
                            ? "A"
                            : e.url === "https://b.com/test"
                                ? "B"
                                : e.url === "https://c.com/test"
                                    ? "C"
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
            Array.apply(null, { length: 10000 }).map(() => {
                return self.trigger("fetch", request);
            })
        ).then(data => {
            const responses = data.map(item => item.body.parts[0]);
            //expect(responses.filter(x => x === "A").length).toBe(33);
            expect(
                Math.round(responses.filter(x => x === "A").length / 1000, 0)
            ).toBe(3);
            expect(
                Math.round(responses.filter(x => x === "B").length / 1000, 0)
            ).toBe(3);
            expect(
                Math.round(responses.filter(x => x === "C").length / 1000, 0)
            ).toBe(3);
        });
    });
});
