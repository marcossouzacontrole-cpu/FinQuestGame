import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const DB_URL = Deno.env.get("DATABASE_URL") || "postgres://finquest:finquest123@localhost:5432/finquest_local";

async function runMigrations() {
    const client = new Client(DB_URL);

    try {
        await client.connect();
        console.log("🔗 Connected to PostgreSQL for migrations...");

        // 1. Create migrations table if not exists
        await client.queryArray(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Read migration files
        const migrationsDir = "./migrations";
        try {
            await Deno.mkdir(migrationsDir);
        } catch (e) {/* ignore */ }

        const files = [];
        for await (const entry of Deno.readDir(migrationsDir)) {
            if (entry.isFile && entry.name.endsWith(".sql")) {
                files.push(entry.name);
            }
        }
        files.sort();

        // 3. Execute new migrations
        for (const file of files) {
            const alreadyExecuted = await client.queryArray(
                "SELECT id FROM _migrations WHERE name = $1",
                [file]
            );

            if (alreadyExecuted.rows.length === 0) {
                console.log(`🚀 Executing migration: ${file}`);
                const sql = await Deno.readTextFile(`${migrationsDir}/${file}`);

                // Split by semicolon for multiple statements (naive split)
                const statements = sql.split(";").filter(s => s.trim().length > 0);

                for (const statement of statements) {
                    await client.queryArray(statement);
                }

                await client.queryArray(
                    "INSERT INTO _migrations (name) VALUES ($1)",
                    [file]
                );
            } else {
                console.log(`✅ Skipping already executed: ${file}`);
            }
        }

        console.log("🎊 All migrations completed!");
    } catch (error) {
        console.error("❌ Migration error:", error);
    } finally {
        await client.end();
    }
}

runMigrations();
