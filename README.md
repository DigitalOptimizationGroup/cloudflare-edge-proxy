### Cloudflare Edge Proxy

A Cloudflare worker script used to enable a/b testing, canary releasing, gatekeeping, and SEO a/b/n testing.

### Features

-   A/B/n testing across multiple backends, even running across multiple cloud providers
-   Canary releasing with gradual traffic migration
-   Dynamic Gatekeeping
-   SEO A/B testing

### Usage

`npm install --save cloudflare-edge-proxy`

Deploy as a Cloudflare worker function: https://developers.cloudflare.com/workers/about/

#### A/B/N Testing

All assignments are done deterministically, by hashing a salt and visitor Id. On every visit the proxy creates a unique request id (using `uuid/v4`) and forwards this to the origin as a `request-id` header. On first visits the proxy will use this id as the assignment id. To assure consistent hashing this MUST be set as a `_vq` cookie. On the first request the value of this cookie should be set from the `request-id` header and on subsequent visits it should come from the `_vq` cookie (not from the request-id header). For example, in an `express` app, that might be done as follows:

```js
// set or reset the visitor ID cookie
res.cookie("_vq", req.cookies["_vq"] || req.headers["request-id"], {
    maxAge: 3600 * 1000 * 24 * 365
});
```

You can optionally have the proxy setup this cookie for you by passing an additional config param: `{setCookie: true}`

The worker script:

```js
import cloudflareEdgeProxy from "cloudflare-edge-proxy";

const config = {
    defaultBackend: "https://a.com",
    abtest: true,
    origins: [
        { url: "https://a.com" },
        { url: "https://b.com" },
        { url: "https://c.com" }
    ],
    salt: "test-abc-123",
    setCookie: true // default is false, if true proxy will set _vq cookie
};

const proxy = cloudflareEdgeProxy(config);

addEventListener("fetch", event => {
    event.respondWith(proxy(event));
});
```

#### Canary Releasing Example

Canary releasing can be used to gradually shift traffic from one backend to another. It should ONLY be used with two backends, (unlike a/b/n testing), so that users do not get reassigned as the traffic percentage is increased. An example config is shown below. To assure consistent assignment, for visitors, the `weight` parameter should only be increased.

```js
import cloudflareEdgeProxy from "cloudflare-edge-proxy";

const config = {
    canary: true,
    weight: 50, // 0-100
    canaryBackend: "https://canary-backend.com",
    defaultBackend: "https://default-backend.com",
    salt: "canary-abc-123",
    setCookie: true // default is false, if true proxy will set _vq cookie
};

const proxy = cloudflareEdgeProxy(config);

addEventListener("fetch", event => {
    event.respondWith(proxy(event));
});
```

#### Gatekeeping

To enable gatekeeping, you must pass a `JWT_SECRET_KEY` with the config.

```js
import cloudflareEdgeProxy from "cloudflare-edge-proxy";

const config = {
    JWT_SECRET_KEY: process.env["JWT_SECRET_KEY"],
    setGatekeepingCookie: true // default is false, if true will set a 1 day cookie
    /* ... */
};

const proxy = cloudflareEdgeProxy(config);

addEventListener("fetch", event => {
    event.respondWith(proxy(event));
});
```

You can then encode desired backends into a JWT with your secret and then access your root domain with the JWT set as a query parameter `?devtoken=JWT` or as a cookie `devtoken=JWT`. This allows for ANY backend to be accessed through the proxy and can be useful for developing / testing, on your production domain, without having to update the proxy to add development backends.

An example of creating such a token is shown below.

```js
var jwttoken = require("jsonwebtoken");

const devtoken = jwttoken.sign(
    {
        {
            url: "https://example.com"
        }
    },
    process.env["JWT_SECRET_KEY"]
);
```

#### Search Engine Optimization - A/B Testing Example

Search engine optimization a/b testing is a technique used to validate changes that may impact search rankings. With a/b/n testing, as implemented in this proxy, a unique `visitor id` is used to hash to a backend. With SEO based a/b/n testing, the full `path` of each individual request is hashed and used to select the backend. After completion of the experiment period, traffic volumes between the two, or more, SEO implementation are compared for statistical significance.

When running an a/b test, on natural search traffic, it would be wise to validate that your website has enough ranked pages such that a random split of urls results in a generally equal split of natural search traffic (pre-test).

Example config.

```js
import cloudflareEdgeProxy from "cloudflare-edge-proxy";

const config = {
    SEOTest: true,
    origins: [
        { url: "https://a.com" },
        { url: "https://b.com" },
        { url: "https://c.com" }
    ],
    salt: "seo-test-abc-123"
};

const proxy = cloudflareEdgeProxy(config);

addEventListener("fetch", event => {
    event.respondWith(proxy(event));
});
```

#### Default Backend (no testing)

```js
import cloudflareEdgeProxy from "cloudflare-edge-proxy";

const config = {
    defaultBackend: "https://example.com"
};

const proxy = cloudflareEdgeProxy(config);

addEventListener("fetch", event => {
    event.respondWith(proxy(event));
});
```

#### Echoer

To enable the echoer, you must pass an `ECHO_TOKEN` with the config. You may then access `/echo?echotoken=ECHO_TOKEN` and you will get the `request` object returned as formatted JSON. Useful for debugging.

```js
import cloudflareEdgeProxy from "cloudflare-edge-proxy";

const config = {
    ECHO_TOKEN: process.env["ECHO_TOKEN"]
    /* ... */
};

const proxy = cloudflareEdgeProxy(config);

addEventListener("fetch", event => {
    event.respondWith(proxy(event));
});
```

### Subtle differences of a/b testing, canary releasing, and seo a/b testing

This proxy utilizes hashing to make deterministic (and random) assignments. This is done by hashing an assignment string to a given number of assignment choices. The difference in these three modes lies in this assignment strategy.

#### a/b testing

A/B/n testing creates a hashing string by combining a `salt` and the `userId`. This generates a unique hashing string for each user and provides consistent (and stateless) assignment for that given hashing string. It can be used to a/b/n test any number of backends.

#### canary releasing

The goal of canary releasing is to gradually shift traffic from the default backend to a new `canary` backend. The potential trouble here can be that when increasing the percent of traffic going to the new backend we must assure that users already shifted to the new backend remain there. To do this we again create a hash string from a `salt` and the `userId`. However, this time we use modulo 100 to hash each user to a consistent number between 0 and 99. To move traffic we pick the percent we want, for example 5%. So for all users assigned a number < 5 we show them the canary release. If we then increase to 30% we show all users < 30 the canary, obviously this logic continues to include all prior users shown the canary. In this way you can gradually shift users from the default to the canary backend without causing already shifted users to lose their assignment.

#### seo a/b testing

With SEO a/b testing we are testing the impact of changes to our site on traffic volume from the search engines. To accomplish this we use a `salt` and the `pathname` to hash a given url to a given backend. In this way we randomize among our urls as opposed to our users. Any given path will always be consistently hashed to the same backend for the duration of the testing period.
