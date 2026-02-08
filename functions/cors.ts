export const corsHeaders = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-app-id, x-sdk-version, Accept, Origin, x-requested-with",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
};

export function createCORSHeaders(req?: Request) {
    const headers = new Headers(corsHeaders);
    const origin = req?.headers.get("origin");

    // If we want to support credentials, we CANNOT use "*"
    // We must mirror the request origin or specify it.
    if (origin) {
        headers.set("Access-Control-Allow-Origin", origin);
    } else {
        headers.set("Access-Control-Allow-Origin", "*");
    }

    return headers;
}

export function withCORS(response: Response, req?: Request) {
    const origin = req?.headers.get("origin") || "*";
    response.headers.set("Access-Control-Allow-Origin", origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}
