import { createClient } from "@libsql/client";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_API_KEY;

if (!url) {
  console.error("Missing TURSO_DATABASE_URL in .env");
  process.exit(1);
}

const client = createClient({ url, authToken });

// Create migrations tracking table
await client.execute(`
  CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id TEXT PRIMARY KEY,
    checksum TEXT NOT NULL,
    finished_at DATETIME,
    migration_name TEXT NOT NULL,
    logs TEXT,
    rolled_back_at DATETIME,
    started_at DATETIME DEFAULT current_timestamp,
    applied_steps_count INTEGER DEFAULT 0
  )
`);

// Get already applied migrations
const applied = await client.execute("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL");
const appliedNames = new Set(applied.rows.map((r) => r.migration_name));

// Read migration folders sorted
const migrationsDir = join(projectRoot, "prisma", "migrations");
const folders = readdirSync(migrationsDir)
  .filter((f) => f !== "migration_lock.toml")
  .sort();

for (const folder of folders) {
  if (appliedNames.has(folder)) {
    console.log(`⏭  Already applied: ${folder}`);
    continue;
  }

  const sqlPath = join(migrationsDir, folder, "migration.sql");
  const sql = readFileSync(sqlPath, "utf8");

  console.log(`▶  Applying: ${folder}`);
  try {
    // Split by semicolons and run each statement
    const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await client.execute(stmt);
    }

    await client.execute({
      sql: `INSERT INTO _prisma_migrations (id, checksum, migration_name, finished_at, applied_steps_count)
            VALUES (?, ?, ?, datetime('now'), 1)`,
      args: [crypto.randomUUID(), folder, folder],
    });

    console.log(`✅ Applied: ${folder}`);
  } catch (err) {
    console.error(`❌ Failed: ${folder}`, err.message);
    process.exit(1);
  }
}

console.log("\n✨ All migrations applied successfully!");
process.exit(0);
