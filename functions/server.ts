import { create, decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import db, { ensureConnection } from "./db.ts";
import { createCORSHeaders, corsHeaders } from "./cors.ts";

const JWT_SECRET = Deno.env.get("JWT_SECRET") || "finquest-top-secret-key-2026";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://finquestgame.vercel.app";
const SERVER_URL = Deno.env.get("SERVER_URL") || "https://finquest-api-prod-marcos-123.deno.dev";

// Crypto key for JWT
const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
);

function createResponse(body: any, init: ResponseInit = {}, req?: Request) {
    const headers = createCORSHeaders(req);
    if (init.headers) {
        new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (typeof body === "object" && body !== null && !(body instanceof Uint8Array)) {
        headers.set("Content-Type", "application/json");
        return new Response(JSON.stringify(body), { ...init, headers });
    }
    return new Response(body, { ...init, headers });
}

async function createToken(payload: any) {
    return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

Deno.serve(async (req) => {
    try {
        // 1. Handle CORS Preflight
        if (req.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: createCORSHeaders(req) });
        }

        const url = new URL(req.url);
        const path = url.pathname;

        // 2. Handle Analytics (Anti-Crash for SDK)
        if (path.includes("/analytics/track")) {
            return createResponse({ success: true }, {}, req);
        }

        // 3. Handle Identity (SDK me() support)
        if (path.includes("/entities/User/me") || path.endsWith("/api/auth/me")) {
            const authHeader = req.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                try {
                    const [, payload] = decode(authHeader.split(" ")[1]);
                    return createResponse(payload, {}, req);
                } catch {
                    return createResponse({ error: "Invalid token" }, { status: 401 }, req);
                }
            }
            return createResponse({ error: "Unauthorized" }, { status: 401 }, req);
        }

        // --- AUTH ENDPOINTS ---
        if (path === "/api/auth/register" && req.method === "POST") {
            await ensureConnection();
            const { email, password, name } = await req.json();
            const passwordHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))))
                .map(b => b.toString(16).padStart(2, "0")).join("");

            try {
                const userResult = await db.queryObject(`INSERT INTO "User" (email, full_name) VALUES ($1, $2) RETURNING id`, [email, name]);
                const userId = (userResult.rows[0] as any).id;
                await db.queryObject(`INSERT INTO "UserCredential" (user_id, password_hash) VALUES ($1, $2)`, [userId, passwordHash]);

                const token = await createToken({ email, name, id: userId, exp: Date.now() + 86400000 });
                return createResponse({ token, user: { email, name, id: userId } }, {}, req);
            } catch (e) {
                return createResponse({ error: "User already exists or DB failure" }, { status: 400 }, req);
            }
        }

        if (path === "/api/auth/login" && req.method === "POST") {
            await ensureConnection();
            const { email, password } = await req.json();
            const passwordHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))))
                .map(b => b.toString(16).padStart(2, "0")).join("");

            try {
                const result = await db.queryObject(`
                    SELECT u.id, u.email, u.full_name, c.password_hash 
                    FROM "User" u 
                    JOIN "UserCredential" c ON u.id = c.user_id 
                    WHERE u.email = $1`, [email]);

                const user = result.rows[0] as any;
                if (user && user.password_hash === passwordHash) {
                    const token = await createToken({ email: user.email, name: user.full_name, id: user.id, exp: Date.now() + 86400000 });
                    return createResponse({ token, user: { email: user.email, name: user.full_name, id: user.id } }, {}, req);
                }
                return createResponse({ error: "Invalid credentials" }, { status: 401 }, req);
            } catch (e) {
                return createResponse({ error: "Database error" }, { status: 500 }, req);
            }
        }

        if (path === "/api/auth/google/login") {
            const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
            const redirectUri = `${SERVER_URL}/api/auth/google/callback`;
            const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile`;
            return Response.redirect(googleUrl);
        }

        if (path === "/api/auth/google/callback") {
            await ensureConnection();
            const code = url.searchParams.get("code");
            const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
            const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
            const redirectUri = `${SERVER_URL}/api/auth/google/callback`;

            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `code=${code}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&grant_type=authorization_code`
            });
            const { id_token } = await tokenRes.json();
            const [, payload] = decode(id_token);
            const { email, name, picture } = payload as any;

            let userResult = await db.queryObject(`SELECT id FROM "User" WHERE email = $1`, [email]);
            let userId = userResult.rows[0]?.id;
            if (!userId) {
                const insert = await db.queryObject(`INSERT INTO "User" (email, full_name, avatar_image_url) VALUES ($1, $2, $3) RETURNING id`, [email, name, picture]);
                userId = (insert.rows[0] as any).id;
            }

            const token = await createToken({ email, name, id: userId, exp: Date.now() + 86400000 });
            return Response.redirect(`${APP_BASE_URL}/auth/callback?token=${token}`);
        }

        if (path === "/api/auth/me") {
            const authHeader = req.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                const [, payload] = decode(authHeader.split(" ")[1]);
                return createResponse(payload, {}, req);
            }
            return createResponse("Unauthorized", { status: 401 }, req);
        }

        // --- FUNCTION RUNNER (Lazy loading) ---
        const functionName = path.split('/').pop();
        if (!functionName || path.startsWith("/api/auth")) {
            return createResponse("Not Found", { status: 404 }, req);
        }

        try {
            const modulePath = `./${functionName}.ts`;
            return createResponse(`Function ${functionName} runner not implemented in root. Send to /functions/${functionName} instead.`, { status: 501 }, req);
        } catch (error: any) {
            return createResponse({ error: error?.message }, { status: 500 }, req);
        }
    } catch (globalError: any) {
        console.error("Global Error in server.ts:", globalError);
        return createResponse({ error: "Internal Server Error", message: globalError?.message }, { status: 500 }, req);
    }
});

