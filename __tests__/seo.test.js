import cloudFlareEdgeProxy from "../src";

const makeServiceWorkerEnv = require("service-worker-mock");
const makeFetchMock = require("service-worker-mock/fetch");

describe("Search Engine Optimization - A/B Testing", () => {
    beforeEach(() => {
        Object.assign(global, makeServiceWorkerEnv(), makeFetchMock());
        jest.resetModules();
    });

    it("should equally (approximately) balance assignment", async () => {
        // set up config
        const proxy = cloudFlareEdgeProxy({
            SEOTest: true,
            origins: [
                { url: "https://a.com" },
                { url: "https://b.com" },
                { url: "https://c.com" }
            ],
            salt: "seo-test-abc-123"
        });

        const headers = new Headers({});
        headers.append("Content-Type", "text/html");

        global.fetch = jest.fn(e => {
            return Promise.resolve({
                body: {
                    parts: [
                        e.url.includes("a")
                            ? "A"
                            : e.url.includes("b")
                                ? "B"
                                : e.url.includes("c")
                                    ? "C"
                                    : null
                    ]
                }
            });
        });

        addEventListener("fetch", event => {
            event.respondWith(proxy(event));
        });

        await Promise.all(
            Array.apply(null, { length: 10000 }).map((_, i) => {
                const request = new Request(`/test_${i}`);
                return self.trigger("fetch", request);
            })
        ).then(data => {
            const responses = data.map(item => item.body.parts[0]);
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
