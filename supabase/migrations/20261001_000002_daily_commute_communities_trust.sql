-- ============================================================
-- PO → PO — Daily Commute, Communities, Behavioural Trust
-- Additive migration. NOTE: not yet executed against a live Postgres;
-- review before applying. The Express API currently uses Mongoose models
-- with the same shape (server/models).
-- ============================================================

-- 1. Daily commutes (recurring journeys)
CREATE TABLE IF NOT EXISTS public.daily_commutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label VARCHAR(60) DEFAULT '',
  origin_address TEXT NOT NULL,
  origin_geometry GEOMETRY(Point, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_geometry GEOMETRY(Point, 4326) NOT NULL,
  route_geometry GEOMETRY(LineString, 4326),
  route_distance_m NUMERIC DEFAULT 0,
  route_duration_s NUMERIC DEFAULT 0,
  departure_time TIME NOT NULL,
  arrival_time TIME,
  active_days TEXT[] NOT NULL CHECK (cardinality(active_days) > 0 AND active_days <@ ARRAY['Mon','Tue','Wed','Thu','Fri','Sat','Sun']),
  timezone_offset_min INT NOT NULL DEFAULT 330,
  time_window_min INT NOT NULL DEFAULT 20 CHECK (time_window_min BETWEEN 5 AND 90),
  role VARCHAR(20) NOT NULL DEFAULT 'PASSENGER' CHECK (role IN ('PASSENGER','TRAVELLER','BOTH')),
  transport_mode VARCHAR(10) NOT NULL DEFAULT 'CAR' CHECK (transport_mode IN ('BIKE','CAR')),
  available_seats INT NOT NULL DEFAULT 0 CHECK (available_seats BETWEEN 0 AND 8),
  required_seats INT NOT NULL DEFAULT 1 CHECK (required_seats BETWEEN 1 AND 4),
  auto_match_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_commutes_user ON public.daily_commutes(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_commutes_route_geom ON public.daily_commutes USING GIST(route_geometry);

-- 2. Communities + membership
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  category VARCHAR(20) NOT NULL DEFAULT 'OTHER' CHECK (category IN ('COLLEGE','OFFICE','ROUTE','ORGANIZATION','OTHER')),
  description VARCHAR(240) DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  member_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);

-- 3. Ratings: five 1–10 behavioural parameters on the existing table (no new ratings table)
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS reliability INT CHECK (reliability BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS safety INT CHECK (safety BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS respect INT CHECK (respect BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS route_commitment INT CHECK (route_commitment BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS communication INT CHECK (communication BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS overall NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS journey_id UUID;

-- All five parameters or none (legacy star-only rows keep working)
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_all_params_or_none;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_all_params_or_none CHECK (
  (reliability IS NULL AND safety IS NULL AND respect IS NULL AND route_commitment IS NULL AND communication IS NULL)
  OR (reliability IS NOT NULL AND safety IS NOT NULL AND respect IS NOT NULL AND route_commitment IS NOT NULL AND communication IS NOT NULL)
);
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_no_self_rating;
ALTER TABLE public.ratings ADD CONSTRAINT ratings_no_self_rating CHECK (from_user_id <> to_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ratings_rater_trip ON public.ratings(from_user_id, trip_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ratings_rater_journey ON public.ratings(from_user_id, journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON public.ratings(to_user_id);

-- Eligibility enforced in the database: rater must be a participant, ratee the other one, trip COMPLETED.
CREATE OR REPLACE FUNCTION public.enforce_rating_eligibility() RETURNS TRIGGER AS $$
DECLARE t RECORD;
BEGIN
  SELECT passenger_id, traveller_id, status INTO t FROM public.confirmed_trips WHERE id = NEW.trip_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trip not found'; END IF;
  IF t.status <> 'COMPLETED' THEN RAISE EXCEPTION 'Trip is not completed'; END IF;
  IF NOT ((NEW.from_user_id = t.passenger_id AND NEW.to_user_id = t.traveller_id)
       OR (NEW.from_user_id = t.traveller_id AND NEW.to_user_id = t.passenger_id)) THEN
    RAISE EXCEPTION 'Only trip participants can rate each other';
  END IF;
  NEW.journey_id := NEW.trip_id;  -- one confirmed_trips row = one shared journey
  IF NEW.reliability IS NOT NULL THEN
    NEW.overall := round((NEW.reliability + NEW.safety + NEW.respect + NEW.route_commitment + NEW.communication) / 5.0, 1);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_rating_eligibility ON public.ratings;
CREATE TRIGGER trg_rating_eligibility BEFORE INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rating_eligibility();

-- 4. Cached trust summary (updated on rating writes; profile reads never scan ratings)
CREATE TABLE IF NOT EXISTS public.trust_summaries (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating_count INT NOT NULL DEFAULT 0,
  reliability NUMERIC(3,1), safety NUMERIC(3,1), respect NUMERIC(3,1),
  route_commitment NUMERIC(3,1), communication NUMERIC(3,1),
  overall NUMERIC(3,1),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.refresh_trust_summary() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reliability IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.trust_summaries AS s (user_id, rating_count, reliability, safety, respect, route_commitment, communication, overall, updated_at)
  SELECT NEW.to_user_id, count(*),
         round(avg(reliability),1), round(avg(safety),1), round(avg(respect),1),
         round(avg(route_commitment),1), round(avg(communication),1),
         round((avg(reliability)+avg(safety)+avg(respect)+avg(route_commitment)+avg(communication))/5.0,1),
         NOW()
  FROM public.ratings WHERE to_user_id = NEW.to_user_id AND reliability IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE SET
    rating_count = EXCLUDED.rating_count, reliability = EXCLUDED.reliability, safety = EXCLUDED.safety,
    respect = EXCLUDED.respect, route_commitment = EXCLUDED.route_commitment,
    communication = EXCLUDED.communication, overall = EXCLUDED.overall, updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trg_refresh_trust ON public.ratings;
CREATE TRIGGER trg_refresh_trust AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_trust_summary();

-- 5. Row Level Security
ALTER TABLE public.daily_commutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_summaries ENABLE ROW LEVEL SECURITY;

-- Commutes: owner only (other commuters are surfaced through the matching API, never raw rows)
DROP POLICY IF EXISTS "Owner manages own daily commutes" ON public.daily_commutes;
CREATE POLICY "Owner manages own daily commutes" ON public.daily_commutes FOR ALL
  USING (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = user_id))
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = user_id));

-- Communities: names/counts are visible to signed-in users; created by the caller
DROP POLICY IF EXISTS "Communities are readable" ON public.communities;
CREATE POLICY "Communities are readable" ON public.communities FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users create communities" ON public.communities;
CREATE POLICY "Users create communities" ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = created_by));

-- Membership: members see fellow members; users join/leave only as themselves
DROP POLICY IF EXISTS "Members see community members" ON public.community_members;
CREATE POLICY "Members see community members" ON public.community_members FOR SELECT USING (
  community_id IN (SELECT community_id FROM public.community_members cm
                   WHERE cm.user_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()))
);
DROP POLICY IF EXISTS "Users join as themselves" ON public.community_members;
CREATE POLICY "Users join as themselves" ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = user_id));
DROP POLICY IF EXISTS "Users leave as themselves" ON public.community_members;
CREATE POLICY "Users leave as themselves" ON public.community_members FOR DELETE
  USING (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = user_id));

-- Trust summaries: readable by signed-in users, written only by the SECURITY DEFINER trigger
DROP POLICY IF EXISTS "Trust summaries readable" ON public.trust_summaries;
CREATE POLICY "Trust summaries readable" ON public.trust_summaries FOR SELECT USING (auth.uid() IS NOT NULL);

-- Ratings: inserts only as yourself (eligibility trigger does the rest); readable by rater/ratee
DROP POLICY IF EXISTS "Participants insert own ratings" ON public.ratings;
CREATE POLICY "Participants insert own ratings" ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = from_user_id));
DROP POLICY IF EXISTS "Rater and ratee read ratings" ON public.ratings;
CREATE POLICY "Rater and ratee read ratings" ON public.ratings FOR SELECT USING (
  auth.uid() IN ((SELECT auth_user_id FROM public.profiles WHERE id = from_user_id),
                 (SELECT auth_user_id FROM public.profiles WHERE id = to_user_id))
);
