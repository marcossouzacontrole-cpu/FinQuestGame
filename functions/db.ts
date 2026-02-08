import { Client } from "postgres";

const DATABASE_URL = Deno.env.get("DATABASE_URL") || Deno.env.get("DB_URL") || "postgres://finquest:finquest123@db:5432/finquest_local";

// SSL is usually required for cloud DBs like Neon
const client = new Client(DATABASE_URL);

try {
    await client.connect();
    console.log("✅ Database connected successfully");
} catch (error) {
    console.error("❌ Database connection failed:", error);
}

export default client;
