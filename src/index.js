import uniformIndex from "./assign-uniform";
import showCanary from "./show-canary";
import cookie from "cookie";
import uuid from "uuid/v4";
import querystring from "querystring";
import jwttoken from "jsonwebtoken";

export default config => async event => {
    const request = event.request;
    const { pathname, search } = new URL(request.url);

    const params = querystring.parse(search.split("?")[1] || "");
    const cookies = cookie.parse(request.headers.get("Cookie") || "");

    // create a new requestid for every request
    const requestId = uuid();
    // use the request Id for userId if it's the first request
    // backend is responsible for setting the _vq cookie (or maybe we can set it here?)
    const _vq = cookies["_vq"] || requestId;

    const newHeaders = new Headers(request.headers);
    newHeaders.append("request-id", requestId);

    if (
        pathname === "echo" &&
        config.ECHO_TOKEN &&
        params.echotoken === config.ECHO_TOKEN
    ) {
        return new Response(
            JSON.stringify({
                cookies,
                params,
                pathname,
                headers: [...newHeaders]
            }),
            {
                status: 200,
                headers: new Headers({
                    "Content-Type": "text/html",
                    "Access-Control-Allow-Origin": "*"
                })
            }
        );
    } else if (
        (config.JWT_SECRET_KEY && params.devtoken) ||
        (config.JWT_SECRET_KEY && cookies.devtoken)
    ) {
        // gatekeeping
        // maybe we simplify and just use or set a single token and then differentiate within the token
        // maybe inject something to notify user they are on dev and maybe set cookie?
        try {
            // attempt to validate the jwt
            const data = jwttoken.verify(
                params.devtoken || cookies.devtoken,
                config.JWT_SECRET_KEY
            );
            return fetch(
                new Request(`${data.url}${pathname}${search}`, {
                    ...request,
                    headers: newHeaders
                })
            );
            // if the cookie is not set, then set it (and redirect?)
            // if (!cookies.devtoken) {}
        } catch (e) {
            return fetch(
                new Request(`${config.defaultBackend}${pathname}${search}`, {
                    ...request,
                    headers: newHeaders
                })
            );
        }
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
        } else if (config.SEOTest) {
            // run a/b/n test based on request uri
            const selectedIndex = uniformIndex(
                `${config.salt}.${pathname}`,
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
        } else {
            // default backend
            return fetch(
                new Request(`${config.defaultBackend}${pathname}${search}`, {
                    ...request,
                    headers: newHeaders
                })
            );
        }
    }
};
