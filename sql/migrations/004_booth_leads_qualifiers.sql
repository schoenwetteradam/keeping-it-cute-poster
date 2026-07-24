-- Adds qualifier columns to booth_leads so the public rental form can capture
-- the info needed to qualify a booth renter (license, current situation,
-- client base, availability). Run once on the VM:
--
--   sudo -u postgres psql -d salon_app < sql/migrations/004_booth_leads_qualifiers.sql
--   sudo systemctl restart postgrest   # so PostgREST picks up the new columns
--
-- Safe to run more than once — every statement is idempotent.

\c salon_app

ALTER TABLE salon.booth_leads
  ADD COLUMN IF NOT EXISTS license_status TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_situation TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS client_base TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT '';
