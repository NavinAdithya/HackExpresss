-- ============================================================
-- PO → PO — PostGIS & PostgreSQL Complete Schema Migration
-- Community-Driven Peer-to-Peer Existing-Commute Cost Sharing
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  gender VARCHAR(20) DEFAULT 'other' CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  profile_photo_path TEXT,
  face_reference_path TEXT,
  face_embedding JSONB,
  account_verified BOOLEAN DEFAULT TRUE,
  trust_score INT DEFAULT 80 CHECK (trust_score BETWEEN 0 AND 100),
  plan VARCHAR(20) DEFAULT 'FREE' CHECK (plan IN ('FREE', 'VERIFIED', 'PRO')),
  subscription_status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (subscription_status IN ('FREE', 'ACTIVE', 'EXPIRED', 'CANCELLED')),
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  role_preference VARCHAR(30) DEFAULT 'BOTH' CHECK (role_preference IN ('PASSENGER', 'TRAVELLER', 'BOTH')),
  women_only BOOLEAN DEFAULT FALSE,
  daily_ride_count INT DEFAULT 0,
  daily_ride_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Driver Profiles (Traveller Profile)
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transport_mode VARCHAR(20) NOT NULL CHECK (transport_mode IN ('BIKE', 'CAR')),
  vehicle_model VARCHAR(100),
  vehicle_registration VARCHAR(50),
  vehicle_capacity INT DEFAULT 1 CHECK (vehicle_capacity BETWEEN 1 AND 6),
  available_seats INT DEFAULT 1 CHECK (available_seats BETWEEN 1 AND 6),
  driver_status VARCHAR(30) DEFAULT 'NOT_REQUESTED' CHECK (driver_status IN ('NOT_REQUESTED', 'PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Driver Verifications (Documents for Traveller approval)
CREATE TABLE IF NOT EXISTS public.driver_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  license_doc_path TEXT NOT NULL,
  id_doc_path TEXT NOT NULL,
  vehicle_reg_path TEXT,
  status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewer_notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Passenger Requests
CREATE TABLE IF NOT EXISTS public.passenger_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_geometry GEOMETRY(Point, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_geometry GEOMETRY(Point, 4326) NOT NULL,
  route_geometry GEOMETRY(LineString, 4326),
  transport_preference VARCHAR(20) DEFAULT 'ANY' CHECK (transport_preference IN ('ANY', 'BIKE', 'CAR')),
  departure_time TIMESTAMPTZ NOT NULL,
  time_window_minutes INT DEFAULT 30,
  seat_count INT DEFAULT 1,
  budget_min NUMERIC(10, 2) DEFAULT 0,
  budget_max NUMERIC(10, 2) DEFAULT 500,
  female_only BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MATCHED', 'ACCEPTED', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Traveller Commutes (Existing Commutes Shared by Travellers)
CREATE TABLE IF NOT EXISTS public.traveller_commutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_address TEXT NOT NULL,
  origin_geometry GEOMETRY(Point, 4326) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_geometry GEOMETRY(Point, 4326) NOT NULL,
  route_geometry GEOMETRY(LineString, 4326),
  transport_mode VARCHAR(20) NOT NULL CHECK (transport_mode IN ('BIKE', 'CAR')),
  departure_time TIMESTAMPTZ NOT NULL,
  time_window_minutes INT DEFAULT 30,
  seat_capacity INT DEFAULT 1 CHECK (seat_capacity BETWEEN 1 AND 6),
  available_seats INT DEFAULT 1 CHECK (available_seats BETWEEN 0 AND 6),
  estimated_fuel_cost NUMERIC(10, 2) NOT NULL,
  tolls NUMERIC(10, 2) DEFAULT 0,
  female_only BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'MATCHED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_request_id UUID NOT NULL REFERENCES public.passenger_requests(id) ON DELETE CASCADE,
  traveller_commute_id UUID NOT NULL REFERENCES public.traveller_commutes(id) ON DELETE CASCADE,
  route_score NUMERIC(5, 2) NOT NULL,
  pickup_score NUMERIC(5, 2) NOT NULL,
  destination_score NUMERIC(5, 2) NOT NULL,
  timing_score NUMERIC(5, 2) NOT NULL,
  transport_score NUMERIC(5, 2) NOT NULL,
  cost_score NUMERIC(5, 2) NOT NULL,
  route_overlap NUMERIC(5, 2) NOT NULL,
  pickup_distance_km NUMERIC(6, 2) NOT NULL,
  destination_distance_km NUMERIC(6, 2) NOT NULL,
  detour_km NUMERIC(6, 2) NOT NULL,
  time_difference_minutes INT NOT NULL,
  match_type VARCHAR(40) NOT NULL CHECK (match_type IN ('EXACT_DESTINATION', 'NEARBY_DESTINATION', 'ROUTE_CORRIDOR', 'ACCEPTABLE_DETOUR')),
  final_score NUMERIC(6, 2) NOT NULL,
  priority_boost NUMERIC(5, 2) DEFAULT 0,
  gemini_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Confirmed Trips Table
CREATE TABLE IF NOT EXISTS public.confirmed_trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES public.matches(id),
  passenger_id UUID NOT NULL REFERENCES public.profiles(id),
  traveller_id UUID NOT NULL REFERENCES public.profiles(id),
  status VARCHAR(30) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'VERIFYING', 'READY_TO_START', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'IDENTITY_MISMATCH')),
  actual_occupants INT DEFAULT 2,
  distance_km NUMERIC(8, 2) NOT NULL,
  fuel_rate NUMERIC(6, 2) DEFAULT 8.0,
  fuel_cost NUMERIC(10, 2) NOT NULL,
  tolls NUMERIC(10, 2) DEFAULT 0,
  shared_cost_per_person NUMERIC(10, 2) NOT NULL,
  platform_commission NUMERIC(10, 2) DEFAULT 3.0,
  passenger_total NUMERIC(10, 2) NOT NULL,
  driver_identity_status VARCHAR(20) DEFAULT 'PENDING' CHECK (driver_identity_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  passenger_identity_status VARCHAR(20) DEFAULT 'PENDING' CHECK (passenger_identity_status IN ('PENDING', 'VERIFIED', 'FAILED')),
  pickup_verified BOOLEAN DEFAULT FALSE,
  trip_start_otp_status VARCHAR(20) DEFAULT 'NOT_GENERATED' CHECK (trip_start_otp_status IN ('NOT_GENERATED', 'GENERATED', 'VERIFIED', 'EXPIRED', 'LOCKED')),
  tracking_token UUID DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Trip Locations (Throttled GPS updates)
CREATE TABLE IF NOT EXISTS public.trip_locations (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.confirmed_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  location GEOMETRY(Point, 4326) NOT NULL,
  speed NUMERIC(6, 2),
  heading NUMERIC(6, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Trip Identity Verifications
CREATE TABLE IF NOT EXISTS public.trip_identity_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.confirmed_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  verification_type VARCHAR(20) NOT NULL CHECK (verification_type IN ('TRAVELLER', 'PASSENGER')),
  status VARCHAR(20) NOT NULL,
  result VARCHAR(10) NOT NULL CHECK (result IN ('PASS', 'FAIL')),
  confidence_score NUMERIC(5, 4),
  provider_reference TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Trip Start OTPs
CREATE TABLE IF NOT EXISTS public.trip_start_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.confirmed_trips(id) ON DELETE CASCADE,
  otp_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  used_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'LOCKED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Trusted Contacts
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  circle VARCHAR(50) DEFAULT 'Family',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Trusted Circles
CREATE TABLE IF NOT EXISTS public.trusted_circles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  circle_name VARCHAR(60) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. SOS Alerts
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.confirmed_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  location GEOMETRY(Point, 4326) NOT NULL,
  status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'FALSE_ALARM')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Ratings
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.confirmed_trips(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id),
  to_user_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Penalties
CREATE TABLE IF NOT EXISTS public.penalties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.confirmed_trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES public.profiles(id),
  traveller_id UUID NOT NULL REFERENCES public.profiles(id),
  reason VARCHAR(50) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  compensation NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'RECORDED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('FREE', 'VERIFIED', 'PRO')),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  trip_id UUID REFERENCES public.confirmed_trips(id),
  category VARCHAR(50) NOT NULL,
  subject VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Impact Metrics
CREATE TABLE IF NOT EXISTS public.impact_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_trips_count INT DEFAULT 0,
  shared_distance_km NUMERIC(10, 2) DEFAULT 0,
  estimated_savings_inr NUMERIC(10, 2) DEFAULT 0,
  potential_trips_avoided INT DEFAULT 0,
  estimated_co2_kg_saved NUMERIC(10, 2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SPATIAL INDEXES (PostGIS GiST)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_passenger_origin_geom ON public.passenger_requests USING GIST(origin_geometry);
CREATE INDEX IF NOT EXISTS idx_passenger_dest_geom ON public.passenger_requests USING GIST(destination_geometry);
CREATE INDEX IF NOT EXISTS idx_traveller_origin_geom ON public.traveller_commutes USING GIST(origin_geometry);
CREATE INDEX IF NOT EXISTS idx_traveller_dest_geom ON public.traveller_commutes USING GIST(destination_geometry);
CREATE INDEX IF NOT EXISTS idx_traveller_route_geom ON public.traveller_commutes USING GIST(route_geometry);
CREATE INDEX IF NOT EXISTS idx_trip_locations_geom ON public.trip_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_geom ON public.sos_alerts USING GIST(location);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traveller_commutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmed_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_start_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read basic profile info; owner can update
DROP POLICY IF EXISTS "Public profile view" ON public.profiles;
CREATE POLICY "Public profile view" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = auth_user_id);

-- Passenger Requests: Owner can manage
DROP POLICY IF EXISTS "Users can view open passenger requests" ON public.passenger_requests;
CREATE POLICY "Users can view open passenger requests" ON public.passenger_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own passenger requests" ON public.passenger_requests;
CREATE POLICY "Users can manage own passenger requests" ON public.passenger_requests FOR ALL USING (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = user_id));

-- Traveller Commutes: Anyone can view open commutes; approved owner can manage
DROP POLICY IF EXISTS "Users can view open traveller commutes" ON public.traveller_commutes;
CREATE POLICY "Users can view open traveller commutes" ON public.traveller_commutes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own traveller commutes" ON public.traveller_commutes;
CREATE POLICY "Users can manage own traveller commutes" ON public.traveller_commutes FOR ALL USING (auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = user_id));

-- Confirmed Trips: Only participants can view and manage
DROP POLICY IF EXISTS "Participants can view confirmed trip" ON public.confirmed_trips;
CREATE POLICY "Participants can view confirmed trip" ON public.confirmed_trips FOR SELECT USING (
  auth.uid() IN (
    (SELECT auth_user_id FROM public.profiles WHERE id = passenger_id),
    (SELECT auth_user_id FROM public.profiles WHERE id = traveller_id)
  )
);

-- Trip Start OTPs: NEVER directly readable by client!
-- Only accessible via Edge Functions with SERVICE ROLE key
DROP POLICY IF EXISTS "No public read for trip start OTPs" ON public.trip_start_otps;
CREATE POLICY "No public read for trip start OTPs" ON public.trip_start_otps FOR ALL USING (false);

-- Driver Verifications: Private document references
DROP POLICY IF EXISTS "Only owner can view driver verifications" ON public.driver_verifications;
CREATE POLICY "Only owner can view driver verifications" ON public.driver_verifications FOR SELECT USING (
  auth.uid() = (SELECT auth_user_id FROM public.profiles WHERE id = user_id)
);

-- ============================================================
-- SEED DATA (Chennai Commuters & Sample Commutes)
-- ============================================================
INSERT INTO public.profiles (id, name, phone, gender, plan, subscription_status, account_verified, trust_score, women_only)
VALUES
  ('66f00000-0000-0000-0000-000000000001', 'Priya Sharma', '9876543210', 'female', 'VERIFIED', 'ACTIVE', true, 85, false),
  ('66f00000-0000-0000-0000-000000000002', 'Rahul Kumar', '9876543211', 'male', 'PRO', 'ACTIVE', true, 78, false),
  ('66f00000-0000-0000-0000-000000000003', 'Ananya Iyer', '9876543212', 'female', 'VERIFIED', 'ACTIVE', true, 92, true),
  ('66f00000-0000-0000-0000-000000000004', 'Vikram Rajan', '9876543213', 'male', 'FREE', 'ACTIVE', true, 71, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.driver_profiles (id, user_id, transport_mode, vehicle_model, vehicle_registration, vehicle_capacity, available_seats, driver_status)
VALUES
  ('66f10000-0000-0000-0000-000000000002', '66f00000-0000-0000-0000-000000000002', 'BIKE', 'Royal Enfield Hunter 350', 'TN 07 BZ 4521', 1, 1, 'APPROVED'),
  ('66f10000-0000-0000-0000-000000000004', '66f00000-0000-0000-0000-000000000004', 'CAR', 'Hyundai i20', 'TN 09 CQ 8820', 3, 2, 'APPROVED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.traveller_commutes (
  id, user_id, origin_address, origin_geometry, destination_address, destination_geometry,
  transport_mode, departure_time, seat_capacity, available_seats, estimated_fuel_cost, tolls, female_only, status
) VALUES (
  '66f20000-0000-0000-0000-000000000001',
  '66f00000-0000-0000-0000-000000000002',
  'Velachery Vijayanagar',
  ST_SetSRID(ST_MakePoint(80.2180, 12.9815), 4326),
  'Guindy Kathipara Junction',
  ST_SetSRID(ST_MakePoint(80.2080, 13.0067), 4326),
  'BIKE',
  NOW() + INTERVAL '1 hour',
  1,
  1,
  100.00,
  0,
  false,
  'OPEN'
) ON CONFLICT (id) DO NOTHING;

