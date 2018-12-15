import uniformIndex from "./assign-uniform";
import showCanary from "./show-canary";
const cookie = require("cookie");
const uuid = require("uuid/v4");
const querystring = require("querystring");
const jwttoken = require("jsonwebtoken");

export default config => async event => {
    const request = event.request;
    const { pathname, search } = new URL(request.url);

    const params = querystring.parse(search.split("?")[1] || "");
    const cookies = cookie.parse(request.headers.get("Cookie") || "");

    // create a new requestid for every request
    const requestId = uuid();
    // use the request Id for userId if it's the first request
    const _vq = cookies["_vq"] || requestId;

    const newHeaders = new Headers(request.headers);
    newHeaders.append("request-id", requestId);

    if (
        (config.JWT_SECRET_KEY && params.devtoken) ||
        (config.JWT_SECRET_KEY && cookies.devtoken)
    ) {
        // gatekeeping
    } else {
        if (config.abtest) {
            // run a/b/n test
            const selectedIndex = uniformIndex(
                `${config.salt}.${_vq}`,
                config.origins.length
            );

            return fetch(
                new Request(
                    `${config.origins[selectedIndex].url}${pathname}${search}`,
                    {
                        ...request,
                        headers: newHeaders
                    }
                )
            );
        } else if (config.canary) {
            // choose canary or default
            const canaryBoolean = showCanary(
                `${config.salt}.${_vq}`,
                config.weight
            );

            return fetch(
                new Request(
                    `${
                        canaryBoolean
                            ? config.canaryBackend
                            : config.defaultBackend
                    }${pathname}${search}`,
                    {
                        ...request,
                        headers: newHeaders
                    }
                )
            );
        }
    }
};
