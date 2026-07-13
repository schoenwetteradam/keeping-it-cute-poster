-- Adds admin-editable content goals to an already-provisioned database. Run
-- this once on the VM if salon_app already exists:
--
--   sudo -u postgres psql -d salon_app < sql/migrations/002_content_goals.sql
--
-- Safe to run more than once — every statement is idempotent.

\c salon_app

CREATE TABLE IF NOT EXISTS salon.content_goals (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ai_guidance TEXT NOT NULL DEFAULT '',
  hashtags_instagram TEXT NOT NULL DEFAULT '',
  hashtags_linkedin TEXT NOT NULL DEFAULT '',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO salon.content_goals
  (id, label, description, ai_guidance, hashtags_instagram, hashtags_linkedin, is_builtin, sort_order)
VALUES
  ('booth_renters', 'Attract Booth Renters',
   'Reach independent beauty professionals looking for their next salon home.',
   'Speak peer-to-peer about independence, community, support, professionalism, location, and business growth. Use a natural invitation to ask about availability.',
   '#boothrental #salonlife #independentstylist #beautyentrepreneur #salonowner #hairstylistlife #btccuts #modernsalon #suitelife #beautybusiness',
   '#boothrental #beautyentrepreneur #salonlife #hairstylist', true, 1),
  ('new_clients', 'Attract New Clients',
   'Help potential clients picture the service, result, and experience.',
   'Make the experience feel welcoming and specific. Describe the result and include a clear, natural booking action.',
   '#newhair #hairtransformation #hairgoals #salonlife #btccuts #modernsalon #haircolor #freshcut #naturalhair #haircare',
   '#salon #haircare #beauty #clientlove', true, 2),
  ('showcase', 'Showcase My Work',
   'Share a transformation, technique, or service without a hard sell.',
   'Describe the transformation, technique, creative decisions, and client story. Let genuine pride in the craft carry the post.',
   '#btccuts #hairinspo #hairtransformation #hairgoals #naturalhair #salonlife #modernsalon #haircolor #colorist #hairart',
   '#craftandskill #beautyprofessional #hairstylist #salonwork', true, 3),
  ('community', 'Build Community',
   'Share tips, celebrate the team, or start a genuine conversation.',
   'Share something useful, celebratory, personal, or discussion-worthy. Prioritize connection over conversion.',
   '#salonteam #beautycommunity #haircare #salonlife #tipsandtricks #behindthechair #hairadvice #beautytips #naturalhair',
   '#beauty #community #teamwork #salonsuccess', true, 4)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON salon.content_goals TO web_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON salon.content_goals TO salon_app_user;
