'use strict';
/* Loads seed.sql into Postgres using DATABASE_URL. */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[db:seed] No DATABASE_URL — memory store is pre-seeded. Nothing to do.');
    return;
  }
  const { Client } = require('pg');
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'seed.sql'), 'utf8');
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('[db:seed] seed data loaded.');
}
main().catch((e) => { console.error('[db:seed] failed:', e.message); process.exit(1); });
