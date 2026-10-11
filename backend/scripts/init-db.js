'use strict';
/* Creates schema in Postgres using DATABASE_URL. No-op hint in memory mode. */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[db:init] No DATABASE_URL — memory mode needs no init. Set DATABASE_URL to init Postgres.');
    return;
  }
  const { Client } = require('pg');
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'schema.sql'), 'utf8');
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('[db:init] schema applied.');
}
main().catch((e) => { console.error('[db:init] failed:', e.message); process.exit(1); });
