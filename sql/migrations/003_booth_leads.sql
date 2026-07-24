-- Adds the booth-rental leads table to an already-provisioned database. Run
-- this once on the VM if salon_app already exists:
--
--   sudo -u postgres psql -d salon_app < sql/migrations/003_booth_leads.sql
--
-- Safe to run more than once — every statement is idempotent.

\c salon_app

CREATE TABLE IF NOT EXISTS salon.booth_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  services TEXT DEFAULT '',
  timeframe TEXT DEFAULT '',
  message TEXT DEFAULT '',
  source TEXT DEFAULT 'landing_page',
  status TEXT NOT NULL DEFAULT 'new',
  status_notes TEXT DEFAULT '',
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT booth_leads_status_check
    CHECK (status IN ('new', 'contacted', 'touring', 'signed', 'lost'))
);

CREATE INDEX IF NOT EXISTS booth_leads_status_idx ON salon.booth_leads (status);
CREATE INDEX IF NOT EXISTS booth_leads_created_idx ON salon.booth_leads (created_at DESC);

-- Only the writer role gets access; customer PII must never be readable by the
-- anonymous role. The public form inserts through salon_app_user server-side.
GRANT SELECT, INSERT, UPDATE, DELETE ON salon.booth_leads TO salon_app_user;
REVOKE ALL ON salon.booth_leads FROM web_anon;
