import { Client } from "postgres";

const DATABASE_URL = Deno.env.get("DATABASE_URL") || Deno.env.get("DB_URL") || "postgres://finquest:finquest123@db:5432/finquest_local";

const client = new Client(DATABASE_URL);

// Lazy connection to avoid blocking server start
let isConnected = false;
export async function ensureConnection() {
    if (isConnected) return;
    try {
        await client.connect();
        isConnected = true;
        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Database connection failed:", error);
    }
}

export default client;
