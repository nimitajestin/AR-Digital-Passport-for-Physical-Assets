'use strict';

const config = require('./config');
const { createApp } = require('./app');

// Fail fast without a real database. The in-memory store exists ONLY for
// automated tests (NODE_ENV=test) or explicit USE_MEMORY_DB=true — it must
// never silently serve the running application.
if (!config.databaseUrl && !config.memoryRequested && config.nodeEnv !== 'test') {
  // eslint-disable-next-line no-console
  console.error(
    '[backend] DATABASE_URL is not set. The server requires a real PostgreSQL database.\n' +
    '  Options:\n' +
    '    1. Start the bundled Postgres:  docker compose up -d db   (from repo root)\n' +
    '       then:  docker compose --profile tools run --rm db-seed\n' +
    '    2. Point at Supabase/any Postgres:  set DATABASE_URL in .env (see .env.example)\n' +
    '  Test-only escape hatch: USE_MEMORY_DB=true (data is ephemeral, never use in demo/prod).'
  );
  process.exit(1);
}

const app = createApp();
app.listen(config.port, () => {
  // eslint-disable-next-line global-require, no-console
  const mode = require('./db').useMemory() ? 'memory (TEST/EXPLICIT ONLY)' : 'postgres';
  console.log(`[backend] listening on :${config.port} (env=${config.nodeEnv}, db=${mode})`);
});
