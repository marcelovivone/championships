const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, 'drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    console.log(`Applying ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`✅ ${file} applied successfully`);
    } catch (err) {
      console.error(`❌ Error applying ${file}:`, err.message);
      // Continue with other migrations
    }
  }

  await pool.end();
  console.log('Migration process completed');
}

applyMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
