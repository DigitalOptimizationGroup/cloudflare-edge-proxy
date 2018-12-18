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
    // backend is responsible for setting the _vq cookie
    const _vq = cookies["_vq"] || requestId;

    const newHeaders = new Headers(request.headers);
    newHeaders.append("request-id", requestId);

    if (
        pathname === "/echo" &&
        config.ECHO_TOKEN &&
        params.echotoken === config.ECHO_TOKEN
    ) {
        return new Response(
            `<pre>${JSON.stringify(
                {
                    cookies,
                    params,
                    pathname,
                    headers: [...newHeaders]
                },
                null,
                4
            )}</pre>`,
            {
                status: 200,
                headers: new Headers({
                    "Content-Type": "text/html"
                })
            }
        );
    } else if (
        (config.JWT_SECRET_KEY && params.devtoken) ||
        (config.JWT_SECRET_KEY && cookies.devtoken)
    ) {
        // gatekeeping
        try {
            // attempt to validate the jwt
            const data = jwttoken.verify(
                params.devtoken || cookies.devtoken,
                config.JWT_SECRET_KEY
            );
            const response = await fetch(
                new Request(`${data.url}${pathname}${search}`, {
                    ...request,
                    headers: newHeaders
                })
            );

            if (config.setGatekeepingCookie) {
                // set the token in a cookie that expires in 1 day
                const newHeaders = new Headers(response.headers);
                newHeaders.append(
                    "Set-Cookie",
                    cookie.serialize(
                        "devtoken",
                        params.devtoken || cookies.devtoken,
                        {
                            httpOnly: true,
                            maxAge: 60 * 60 * 24 // 1 day
                        }
                    )
                );
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders
                });
            } else {
                return response;
            }
        } catch (e) {
            // invalid JWT, return default backend
            return await fetch(
                new Request(`${config.defaultBackend}${pathname}${search}`, {
                    ...request,
                    headers: newHeaders
                })
            );
        }
    } else if (config.abtest) {
        // run a/b/n test
        const selectedIndex = uniformIndex(
            `${config.salt}.${_vq}`,
            config.origins.length
        );

        const response = await fetch(
            new Request(
                `${config.origins[selectedIndex].url}${pathname}${search}`,
                {
                    ...request,
                    headers: newHeaders
                }
            )
        );

        if (config.setCookie) {
            const newHeaders = new Headers(response.headers);
            newHeaders.append(
                "Set-Cookie",
                cookie.serialize("_vq", _vq, {
                    httpOnly: true,
                    maxAge: 60 * 60 * 24 * 365 // 1 year
                })
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } else {
            return response;
        }
    } else if (config.canary) {
        // choose canary or default
        const canaryBoolean = showCanary(
            `${config.salt}.${_vq}`,
            config.weight
        );

        const response = await fetch(
            new Request(
                `${
                    canaryBoolean ? config.canaryBackend : config.defaultBackend
                }${pathname}${search}`,
                {
                    ...request,
                    headers: newHeaders
                }
            )
        );
        if (config.setCookie) {
            const newHeaders = new Headers(response.headers);
            newHeaders.append(
                "Set-Cookie",
                cookie.serialize("_vq", _vq, {
                    httpOnly: true,
                    maxAge: 60 * 60 * 24 * 365 // 1 year
                })
            );
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } else {
            return response;
        }
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
};
