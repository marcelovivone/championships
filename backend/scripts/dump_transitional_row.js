#!/usr/bin/env node
const { Pool } = require('pg');

(async () => {
  try {
    const conn = process.env.DATABASE_URL || process.env.DATABASE || null;
    if (!conn) {
      console.error('Missing DATABASE_URL environment variable. Set it and retry.');
      process.exit(2);
    }
    const pool = new Pool({ connectionString: conn });
    const id = process.argv[2] || '17';
    const res = await pool.query('SELECT payload FROM api_transitional WHERE id = $1 LIMIT 1', [id]);
    if (!res.rows.length) {
      console.error(`No transitional row found with id=${id}`);
      process.exit(3);
    }
    const payload = res.rows[0].payload;
    console.log(JSON.stringify(payload, null, 2));
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Error while dumping transitional row:', e && e.stack ? e.stack : String(e));
    process.exit(1);
  }
})();
