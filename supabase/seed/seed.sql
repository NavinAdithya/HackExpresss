-- ============================================================
-- PO → PO — Seed Data for Chennai Commuters
-- ============================================================

INSERT INTO public.profiles (id, name, phone, gender, plan, subscription_status, account_verified, trust_score, women_only)
VALUES
  ('66f00000-0000-0000-0000-000000000001', 'Priya Sharma', '9876543210', 'female', 'VERIFIED', 'ACTIVE', true, 85, false),
  ('66f00000-0000-0000-0000-000000000002', 'Rahul Kumar', '9876543211', 'male', 'PRO', 'ACTIVE', true, 78, false),
  ('66f00000-0000-0000-0000-000000000003', 'Ananya Iyer', '9876543212', 'female', 'VERIFIED', 'ACTIVE', true, 92, true),
  ('66f00000-0000-0000-0000-000000000004', 'Vikram Rajan', '9876543213', 'male', 'FREE', 'ACTIVE', true, 71, false)
ON CONFLICT (id) DO NOTHING;

-- Approved Traveller Profile for Rahul Kumar
INSERT INTO public.driver_profiles (id, user_id, transport_mode, vehicle_model, vehicle_registration, vehicle_capacity, available_seats, driver_status)
VALUES
  ('66f10000-0000-0000-0000-000000000002', '66f00000-0000-0000-0000-000000000002', 'BIKE', 'Royal Enfield Hunter 350', 'TN 07 BZ 4521', 1, 1, 'APPROVED'),
  ('66f10000-0000-0000-0000-000000000004', '66f00000-0000-0000-0000-000000000004', 'CAR', 'Hyundai i20', 'TN 09 CQ 8820', 3, 2, 'APPROVED')
ON CONFLICT (id) DO NOTHING;

-- Sample Commutes (Velachery -> Guindy)
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
