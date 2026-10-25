
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("../src/config/database");

const migrationsDirectory = path.join(__dirname, "../db/migrations");

async function migrate() {
  const client = await pool.connect();

  try {
    // Create a table that tracks completed migrations.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Find SQL files and execute them in alphabetical order.
    const files = fs
      .readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const result = await client.query(
        "SELECT migration_name FROM schema_migrations WHERE migration_name = $1",
        [file]
      );

      if (result.rowCount > 0) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(
        path.join(migrationsDirectory, file),
        "utf8"
      );

      console.log(`Applying migration: ${file}`);

      await client.query("BEGIN");

      try {
        await client.query(sql);

        await client.query(
          "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
          [file]
        );

        await client.query("COMMIT");
        console.log(`Successfully applied: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Database migrations completed.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
});
