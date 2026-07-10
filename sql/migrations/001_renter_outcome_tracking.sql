-- Adds real-world booth-renter outcome tracking to an already-provisioned
-- database. Run this once on the VM if salon_app already exists (i.e. you
-- ran sql/schema.sql before this migration was added):
--
--   sudo -u postgres psql -d salon_app < sql/migrations/001_renter_outcome_tracking.sql
--
-- Safe to run more than once — every statement is idempotent.

\c salon_app

ALTER TABLE salon.generated_posts
  ADD COLUMN IF NOT EXISTS renter_outcome TEXT,
  ADD COLUMN IF NOT EXISTS renter_outcome_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS renter_outcome_at TIMESTAMPTZ;

ALTER TABLE salon.generated_posts
  DROP CONSTRAINT IF EXISTS generated_posts_renter_outcome_check;
ALTER TABLE salon.generated_posts
  ADD CONSTRAINT generated_posts_renter_outcome_check
    CHECK (renter_outcome IS NULL OR renter_outcome IN ('inquiry', 'tour_scheduled', 'signed'));

CREATE OR REPLACE FUNCTION salon.booth_renter_funnel()
RETURNS TABLE (
  total_posts BIGINT,
  inquiries BIGINT,
  tours_scheduled BIGINT,
  signed BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*) AS total_posts,
    COUNT(*) FILTER (WHERE renter_outcome IN ('inquiry', 'tour_scheduled', 'signed')) AS inquiries,
    COUNT(*) FILTER (WHERE renter_outcome IN ('tour_scheduled', 'signed')) AS tours_scheduled,
    COUNT(*) FILTER (WHERE renter_outcome = 'signed') AS signed
  FROM salon.generated_posts
  WHERE goal = 'booth_renters';
$$;

CREATE OR REPLACE FUNCTION salon.booth_renter_performance()
RETURNS TABLE (
  platform TEXT,
  variant TEXT,
  post_count BIGINT,
  inquiries BIGINT,
  signed BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    platform, variant,
    COUNT(*) AS post_count,
    COUNT(*) FILTER (WHERE renter_outcome IN ('inquiry', 'tour_scheduled', 'signed')) AS inquiries,
    COUNT(*) FILTER (WHERE renter_outcome = 'signed') AS signed
  FROM salon.generated_posts
  WHERE goal = 'booth_renters'
  GROUP BY platform, variant
  HAVING COUNT(*) > 0
  ORDER BY signed DESC, inquiries DESC;
$$;

GRANT EXECUTE ON FUNCTION salon.booth_renter_funnel() TO web_anon, salon_app_user;
GRANT EXECUTE ON FUNCTION salon.booth_renter_performance() TO web_anon, salon_app_user;
