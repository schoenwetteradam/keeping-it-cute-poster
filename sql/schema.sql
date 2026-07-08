-- Keeping It Cute Poster — Postgres schema for the PostgREST API.
--
-- Run this on the VM as the postgres superuser:
--   sudo -u postgres psql -f sql/schema.sql
--
-- It creates the salon_app database, the roles PostgREST switches between
-- (authenticator / web_anon / salon_app_user), the app tables, a read
-- model for the dashboard's list/summary views, and a few RPC functions
-- that do aggregation or atomic updates PostgREST can't express as a
-- plain REST filter. See docs/postgres-api-setup.md for the full setup.

CREATE DATABASE salon_app;

\c salon_app

-- gen_random_uuid() ships in core on Postgres 13+; this is a harmless
-- no-op on those versions and keeps older installs working too.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Roles --------------------------------------------------------------

-- PostgREST logs in as this role. It has no table privileges of its own —
-- it only switches into web_anon or salon_app_user per request.
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

-- Unauthenticated requests run as this role. Read-only.
CREATE ROLE web_anon NOLOGIN;
GRANT web_anon TO authenticator;

-- Requests carrying a valid JWT with role=salon_app_user run as this role.
-- This is what the Next.js server uses for writes.
CREATE ROLE salon_app_user NOLOGIN;
GRANT salon_app_user TO authenticator;

CREATE SCHEMA salon;
GRANT USAGE ON SCHEMA salon TO web_anon, salon_app_user;

-- 2. Tables ---------------------------------------------------------------

CREATE TABLE salon.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  tags TEXT DEFAULT ''
);

CREATE TABLE salon.generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name TEXT,
  platform TEXT,
  goal TEXT,
  post_text TEXT,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  posted BOOLEAN DEFAULT false,
  facebook_post_id TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_updated_at TIMESTAMPTZ,
  media_url TEXT DEFAULT '',
  variant TEXT DEFAULT 'balanced',
  external_post_id TEXT DEFAULT '',
  posted_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  publish_status TEXT DEFAULT 'draft',
  retry_count INTEGER DEFAULT 0
);

CREATE TABLE salon.post_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES salon.generated_posts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  notes TEXT DEFAULT '',
  rated_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  -- One rating per (post, rater); lets the API upsert with a single POST.
  CONSTRAINT post_ratings_post_rater_unique UNIQUE (post_id, rated_by)
);

CREATE TABLE salon.brand_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE salon.post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT NOT NULL DEFAULT 'showcase',
  context TEXT DEFAULT '',
  platforms JSONB DEFAULT '["facebook","instagram","linkedin"]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Server-side application state (OAuth tokens, etc.). Holds secrets, so
-- web_anon's read access is revoked below — only salon_app_user can touch it.
CREATE TABLE salon.app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Read model -------------------------------------------------------------
-- generated_posts joined with its average rating, used by the dashboard's
-- list/schedule views so the API doesn't need arbitrary GROUP BY support.

CREATE VIEW salon.generated_posts_enriched AS
SELECT
  gp.*,
  r.avg_rating,
  r.rating_count
FROM salon.generated_posts gp
LEFT JOIN (
  SELECT post_id, AVG(rating) AS avg_rating, COUNT(*) AS rating_count
  FROM salon.post_ratings
  GROUP BY post_id
) r ON r.post_id = gp.id;

-- 4. RPC functions ----------------------------------------------------------
-- PostgREST exposes these at POST /rpc/<name>. Used for aggregate reads
-- and for updates that need an atomic increment rather than a literal PATCH.

CREATE FUNCTION salon.posts_summary()
RETURNS TABLE (
  total_posts BIGINT,
  published_posts BIGINT,
  avg_engagement NUMERIC,
  avg_rating NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*) AS total_posts,
    COUNT(*) FILTER (WHERE gp.posted) AS published_posts,
    ROUND(AVG(NULLIF(gp.likes + gp.comments + gp.shares, 0)), 1) AS avg_engagement,
    ROUND(AVG(pr.avg_rating), 1) AS avg_rating
  FROM salon.generated_posts gp
  LEFT JOIN (
    SELECT post_id, AVG(rating) AS avg_rating
    FROM salon.post_ratings
    GROUP BY post_id
  ) pr ON pr.post_id = gp.id;
$$;

CREATE FUNCTION salon.posts_performance()
RETURNS TABLE (
  platform TEXT,
  goal TEXT,
  variant TEXT,
  post_count BIGINT,
  engagement_score NUMERIC,
  avg_rating NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    gp.platform, gp.goal, gp.variant,
    COUNT(*) AS post_count,
    ROUND(AVG(gp.likes + gp.comments * 2 + gp.shares * 3), 1) AS engagement_score,
    ROUND(AVG(pr.avg_rating), 1) AS avg_rating
  FROM salon.generated_posts gp
  LEFT JOIN (
    SELECT post_id, AVG(rating) AS avg_rating
    FROM salon.post_ratings
    GROUP BY post_id
  ) pr ON pr.post_id = gp.id
  GROUP BY gp.platform, gp.goal, gp.variant
  HAVING COUNT(*) > 0
  ORDER BY engagement_score DESC NULLS LAST, avg_rating DESC NULLS LAST;
$$;

CREATE FUNCTION salon.top_examples(p_platform TEXT, p_goal TEXT, p_limit INT DEFAULT 3)
RETURNS TABLE (
  post_text TEXT,
  variant TEXT,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  avg_rating NUMERIC,
  rating_notes TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    gp.post_text, gp.variant, gp.likes, gp.comments, gp.shares,
    AVG(pr.rating) AS avg_rating,
    STRING_AGG(NULLIF(pr.notes, ''), ' | ') AS rating_notes
  FROM salon.generated_posts gp
  LEFT JOIN salon.post_ratings pr ON pr.post_id = gp.id
  WHERE gp.platform = p_platform AND gp.goal = p_goal
  GROUP BY gp.id
  HAVING AVG(pr.rating) >= 4 OR (gp.likes + gp.comments * 2 + gp.shares * 3) >= 15
  ORDER BY AVG(pr.rating) DESC NULLS LAST, (gp.likes + gp.comments * 2 + gp.shares * 3) DESC
  LIMIT p_limit;
$$;

CREATE FUNCTION salon.mark_posted(p_post_id UUID, p_platform TEXT, p_external_id TEXT)
RETURNS SETOF salon.generated_posts
LANGUAGE sql AS $$
  UPDATE salon.generated_posts
  SET
    posted = true,
    publish_status = 'published',
    posted_at = now(),
    external_post_id = p_external_id,
    facebook_post_id = CASE WHEN p_platform = 'facebook' THEN p_external_id ELSE facebook_post_id END
  WHERE id = p_post_id
  RETURNING *;
$$;

CREATE FUNCTION salon.mark_failed(p_post_id UUID)
RETURNS SETOF salon.generated_posts
LANGUAGE sql AS $$
  UPDATE salon.generated_posts
  SET publish_status = 'failed', retry_count = retry_count + 1
  WHERE id = p_post_id
  RETURNING *;
$$;

-- 5. Grants -------------------------------------------------------------

GRANT SELECT ON ALL TABLES IN SCHEMA salon TO web_anon;
GRANT SELECT ON salon.generated_posts_enriched TO salon_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA salon TO salon_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA salon TO salon_app_user;

-- app_state stores secrets — anonymous requests must never read it.
REVOKE ALL ON salon.app_state FROM web_anon;

GRANT EXECUTE ON FUNCTION salon.posts_summary() TO web_anon, salon_app_user;
GRANT EXECUTE ON FUNCTION salon.posts_performance() TO web_anon, salon_app_user;
GRANT EXECUTE ON FUNCTION salon.top_examples(TEXT, TEXT, INT) TO web_anon, salon_app_user;
GRANT EXECUTE ON FUNCTION salon.mark_posted(UUID, TEXT, TEXT) TO salon_app_user;
GRANT EXECUTE ON FUNCTION salon.mark_failed(UUID) TO salon_app_user;
