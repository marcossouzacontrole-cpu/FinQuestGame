const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL environment variable is required.");
    process.exit(1);
}

async function migrate() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Neon
    });

    try {
        await client.connect();
        console.log("✅ Connected to Neon database.");

        // Create migrations table
        await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        const migrationsDir = "c:\\Users\\contabil5\\Desktop\\Projetos Python\\FinQuest\\finquestgame\\migrations";
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const { rows } = await client.query('SELECT id FROM _migrations WHERE name = $1', [file]);

            if (rows.length === 0) {
                console.log(`🚀 Executing migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

                // Split by semicolon and filter out empty statements
                const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

                for (const statement of statements) {
                    await client.query(statement);
                }

                await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
                console.log(`✅ ${file} applied.`);
            } else {
                console.log(`⏭️ Skipping ${file} (already applied).`);
            }
        }

        console.log("🎊 Migration complete!");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

migrate();
