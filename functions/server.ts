import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create, decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import db from "./db.ts";

const PORT = 5174;
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "finquest-top-secret-key-2026";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "http://localhost:5173";
const SERVER_URL = Deno.env.get("SERVER_URL") || "http://localhost:5174";

// Crypto key for JWT
const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
);

type Handler = (req: Request) => Promise<Response>;
let registeredHandler: Handler | null = null;

// SHIM: Intercept Deno.serve calls
// @ts-ignore
globalThis.Deno.serve = (handlerOrOptions: any, maybeHandler?: any) => {
    if (typeof handlerOrOptions === "function") { registeredHandler = handlerOrOptions; }
    else if (typeof maybeHandler === "function") { registeredHandler = maybeHandler; }
    return { finished: Promise.resolve() };
};

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key"
};

async function createToken(payload: any) {
    return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(req.url);
    const path = url.pathname;

    // --- AUTH ENDPOINTS ---
    if (path === "/api/auth/register" && req.method === "POST") {
        const { email, password, name } = await req.json();
        // Simple password hashing simulation (using SHA-256 for local demo)
        const passwordHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))))
            .map(b => b.toString(16).padStart(2, "0")).join("");

        try {
            const userResult = await db.queryObject(`INSERT INTO "User" (email, full_name) VALUES ($1, $2) RETURNING id`, [email, name]);
            const userId = (userResult.rows[0] as any).id;
            await db.queryObject(`INSERT INTO "UserCredential" (user_id, password_hash) VALUES ($1, $2)`, [userId, passwordHash]);

            const token = await createToken({ email, name, id: userId, exp: Date.now() + 86400000 });
            return new Response(JSON.stringify({ token, user: { email, name, id: userId } }), { headers: corsHeaders });
        } catch (e) {
            return new Response(JSON.stringify({ error: "User already exists or DB error" }), { status: 400, headers: corsHeaders });
        }
    }

    if (path === "/api/auth/login" && req.method === "POST") {
        const { email, password } = await req.json();
        const passwordHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))))
            .map(b => b.toString(16).padStart(2, "0")).join("");

        const result = await db.queryObject(`
            SELECT u.id, u.email, u.full_name, c.password_hash 
            FROM "User" u 
            JOIN "UserCredential" c ON u.id = c.user_id 
            WHERE u.email = $1`, [email]);

        const user = result.rows[0] as any;
        if (user && user.password_hash === passwordHash) {
            const token = await createToken({ email: user.email, name: user.full_name, id: user.id, exp: Date.now() + 86400000 });
            return new Response(JSON.stringify({ token, user: { email: user.email, name: user.full_name, id: user.id } }), { headers: corsHeaders });
        }
        return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401, headers: corsHeaders });
    }

    if (path === "/api/auth/google/login") {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
        const redirectUri = `${SERVER_URL}/api/auth/google/callback`;
        const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20email%20profile`;
        return Response.redirect(googleUrl);
    }

    if (path === "/api/auth/google/callback") {
        const code = url.searchParams.get("code");
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
        const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
        const redirectUri = `${SERVER_URL}/api/auth/google/callback`;

        // Exchange code for token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `code=${code}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&grant_type=authorization_code`
        });
        const { id_token } = await tokenRes.json();
        const [, payload] = decode(id_token);
        const { email, name, picture, sub: provider_user_id } = payload as any;

        // Sync User
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
            return new Response(JSON.stringify(payload), { headers: corsHeaders });
        }
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // --- FUNCTION RUNNER ---
    const functionName = path.split('/').pop();
    if (!functionName || path.startsWith("/api/auth")) {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
    }

    try {
        const modulePath = `./${functionName}.ts`;
        registeredHandler = null;
        await import(modulePath + "?t=" + Date.now());

        if (registeredHandler) {
            const response = await (registeredHandler as Handler)(req);
            const newHeaders = new Headers(response.headers);
            newHeaders.set("Access-Control-Allow-Origin", "*");
            return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
        }
        throw new Error(`Function ${functionName} missing handler`);
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error?.message }), { status: 500, headers: corsHeaders });
    }
}, { port: PORT });
