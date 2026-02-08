import { create, decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import db, { ensureConnection } from "./db.ts";

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

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
};

async function createToken(payload: any) {
    return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

Deno.serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // 2. Handle Analytics (Anti-Crash for SDK)
    if (path.includes("/analytics/track/batch")) {
        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
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
            return new Response(JSON.stringify({ token, user: { email, name, id: userId } }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "User already exists or DB failure" }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
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
                return new Response(JSON.stringify({ token, user: { email: user.email, name: user.full_name, id: user.id } }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
            return new Response(JSON.stringify({ error: "Invalid credentials" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: "Database error" }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
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
            return new Response(JSON.stringify(payload), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        return new Response("Unauthorized", {
            status: 401, headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
    }

    // --- FUNCTION RUNNER (Lazy loading) ---
    const functionName = path.split('/').pop();
    if (!functionName || path.startsWith("/api/auth")) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    try {
        const modulePath = `./${functionName}.ts`;
        // In Deno Deploy, top level Deno.serve handles the request
        // Here we simulate the function calling if needed
        // Since we are inside the same process now, we can import or proxy
        return new Response(`Function ${functionName} runner not implemented in root. Send to /functions/${functionName} instead.`, { status: 501, headers: corsHeaders });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error?.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
