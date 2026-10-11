const path = require('path');
// Load backend/.env first (takes precedence), then repo-root .env.
// dotenv never overrides already-set values, so shell env always wins.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  // In-memory store is ONLY for automated tests (`NODE_ENV=test`) or when
  // explicitly requested with USE_MEMORY_DB=true. Normal runs REQUIRE
  // DATABASE_URL (real PostgreSQL) — the server refuses to start without it.
  memoryRequested: process.env.USE_MEMORY_DB
    ? process.env.USE_MEMORY_DB.toLowerCase() === 'true'
    : false,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
