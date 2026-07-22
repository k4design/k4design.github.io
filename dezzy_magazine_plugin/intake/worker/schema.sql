-- Dezzy Property Intake — D1 schema
-- Apply with:  wrangler d1 execute dezzy-intake --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS projects (
  id           TEXT PRIMARY KEY,
  status       TEXT NOT NULL DEFAULT 'draft',   -- draft|submitted|in_design|delivered|archived
  package      TEXT NOT NULL DEFAULT '',        -- marketing package
  submitted    INTEGER NOT NULL DEFAULT 0,      -- 0/1
  ticket       TEXT,                            -- DZ-0001…
  assignee     TEXT NOT NULL DEFAULT '',
  values_json  TEXT NOT NULL DEFAULT '{}',      -- all content fields
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  submitted_at INTEGER
);

CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  filename    TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'uncategorized',
  ext         TEXT NOT NULL DEFAULT 'jpg',      -- stored image extension
  sort        INTEGER NOT NULL DEFAULT 0,       -- order within the project
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id, sort);

-- Monotonic counters (ticket numbers).
CREATE TABLE IF NOT EXISTS counters (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters (name, value) VALUES ('ticket', 0);
