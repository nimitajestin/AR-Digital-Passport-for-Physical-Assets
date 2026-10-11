-- ============================================================
-- AR Digital Passport — PostgreSQL schema (Dev 2)
-- ============================================================
-- Run:  psql "$DATABASE_URL" -f database/schema.sql
-- Requires: PostgreSQL 13+ (works on Supabase PostgreSQL)

BEGIN;

-- ---------- locations ----------
CREATE TABLE IF NOT EXISTS locations (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(32)  NOT NULL UNIQUE,
  name        VARCHAR(128) NOT NULL,
  building    VARCHAR(128),
  floor       VARCHAR(32),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT locations_code_format CHECK (code ~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,30}$')
);

-- ---------- assets ----------
CREATE TABLE IF NOT EXISTS assets (
  id                VARCHAR(32)  PRIMARY KEY,
  name              VARCHAR(128) NOT NULL,
  category          VARCHAR(64)  NOT NULL,
  location_id       INTEGER      NOT NULL REFERENCES locations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status            VARCHAR(32)  NOT NULL DEFAULT 'operational',
  description       TEXT         NOT NULL DEFAULT '',
  image_url         TEXT,
  model_url         TEXT,
  last_maintenance  DATE,
  next_maintenance  DATE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT assets_id_format CHECK (id ~ '^AST-[0-9]{3,}$'),
  CONSTRAINT assets_status CHECK (status IN ('operational','maintenance','degraded','offline','retired')),
  CONSTRAINT assets_dates CHECK (
    last_maintenance IS NULL OR next_maintenance IS NULL OR next_maintenance >= last_maintenance
  )
);

CREATE INDEX IF NOT EXISTS idx_assets_status      ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category     ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_location    ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm   ON assets(name);

-- ---------- asset_markers ----------
-- One physical marker maps to exactly one asset.
CREATE TABLE IF NOT EXISTS asset_markers (
  marker_id   VARCHAR(64) PRIMARY KEY,
  asset_id    VARCHAR(32) NOT NULL UNIQUE REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  target_index INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT markers_id_format CHECK (marker_id ~ '^[a-z0-9][a-z0-9-]{1,62}$')
);

CREATE INDEX IF NOT EXISTS idx_markers_asset ON asset_markers(asset_id);

-- ---------- maintenance_records ----------
CREATE TABLE IF NOT EXISTS maintenance_records (
  id               SERIAL PRIMARY KEY,
  asset_id         VARCHAR(32)  NOT NULL REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  maintenance_date DATE         NOT NULL,
  type             VARCHAR(32)  NOT NULL DEFAULT 'routine',
  description      TEXT         NOT NULL DEFAULT '',
  performed_by     VARCHAR(128),
  cost             NUMERIC(10,2),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT maintenance_type CHECK (type IN ('routine','repair','inspection','upgrade','calibration'))
);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON maintenance_records(maintenance_date DESC);

-- ---------- issues ----------
CREATE TABLE IF NOT EXISTS issues (
  id           SERIAL PRIMARY KEY,
  asset_id     VARCHAR(32)  NOT NULL REFERENCES assets(id) ON UPDATE CASCADE ON DELETE CASCADE,
  description  TEXT         NOT NULL,
  status       VARCHAR(32)  NOT NULL DEFAULT 'open',
  priority     VARCHAR(16)  NOT NULL DEFAULT 'medium',
  reported_by  VARCHAR(128),
  reported_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT issues_status   CHECK (status   IN ('open','in_progress','resolved','rejected')),
  CONSTRAINT issues_priority CHECK (priority IN ('low','medium','high','critical')),
  CONSTRAINT issues_desc_len CHECK (char_length(description) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_issues_asset  ON issues(asset_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_reported ON issues(reported_at DESC);

-- ---------- admin_users (optional auth) ----------
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(32)  NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_role CHECK (role IN ('admin','technician','viewer'))
);

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assets_updated ON assets;
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_issues_updated ON issues;
CREATE TRIGGER trg_issues_updated BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_locations_updated ON locations;
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
