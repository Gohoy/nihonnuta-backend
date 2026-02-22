const pool = require("./pool");
const fs = require("fs");
const path = require("path");

async function runMigrations() {
  // Ensure tracking table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get already-applied migrations
  const { rows: applied } = await pool.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  const appliedSet = new Set(applied.map((r) => r.filename));

  // Scan migration files
  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("[migrator] No migrations directory found, skipping.");
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`[migrator] Applied: ${file}`);
      count++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrator] Failed: ${file}`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  if (count > 0) {
    console.log(`[migrator] ${count} migration(s) applied.`);
  }

  // Seed admin roles from ADMIN_USER_IDS env var (one-time transition)
  await seedAdminRoles();
}

async function seedAdminRoles() {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminIds.length === 0) return;

  // Check if role column exists
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  `);
  if (rows.length === 0) return;

  // Set admin role for users in ADMIN_USER_IDS
  const placeholders = adminIds.map((_, i) => `$${i + 1}`).join(", ");
  const result = await pool.query(
    `UPDATE users SET role = 'admin' WHERE user_id IN (${placeholders}) AND role != 'admin'`,
    adminIds
  );
  if (result.rowCount > 0) {
    console.log(
      `[migrator] Seeded admin role for ${result.rowCount} user(s) from ADMIN_USER_IDS.`
    );
  }
}

module.exports = { runMigrations };
