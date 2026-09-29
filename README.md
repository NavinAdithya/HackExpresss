# PO → PO

> **"Don't book a ride. Find someone already going your way."**  
> *Alternative: "You were going anyway. They were going anyway. PO → PO connects the journey."*

---

## 🚀 1. What PO → PO Is

**PO → PO** is a **community-driven peer-to-peer existing-commute cost-sharing platform**.

It is **NOT** a traditional taxi booking platform, cab service, or commercial ride-hailing marketplace.

### The Core Idea
* A **Traveller** is already travelling somewhere for their own daily commute (e.g., home to office).
* A **Passenger** needs to travel along a compatible route.
* **PO → PO** discovers whether their journeys can be safely combined.

#### Real Commute Example:
* **Traveller:** Velachery → Guindy (Bike, already travelling, existing fuel expense = ₹100).
* **Passenger:** Velachery → Guindy (needs a journey).
* **PO → PO:** Connects them. Travel expense is shared. Passenger contributes approximately ₹50. The Traveller does not operate as a commercial taxi driver and makes no commercial profit.

---

## ⚖️ 2. Why PO → PO Differs from Taxi Platforms

| Attribute | Commercial Taxi Apps (Ola/Uber/Rapido) | PO → PO Commute Sharing |
|---|---|---|
| **Vehicles Supported** | Autos, Cabs, Commercial Taxis, Commercial Bikes | **Private Bikes** (max 1 passenger) & **Private Cars** only. No autos/taxis. |
| **User Role** | Strict separation: "Driver Partner" vs "Rider" | **Single Account**: Any user can be Passenger, Traveller, or both. |
| **Economic Model** | Commercial fare, driver profit, surge multipliers | **Pure Expense Sharing**: Shared fuel + tolls divided by actual occupants. |
| **Pricing Algorithm** | Dynamic surge, supply/demand arbitrage | **Zero Surge**: Fixed fuel rate per km, transparent ₹3 platform fee. |
| **Trip Initiation** | Ride created on demand by commercial driver | **Existing Commute**: Traveller was already going anyway. |
| **Daily Commute Cap** | Unlimited commercial trips | **Max 2 commutes/day** to prevent commercial exploitation. |

---

## 📱 3. Workflows

### 3.1 Passenger Workflow ("Find a Ride")
1. **Open PO → PO** and select **Passenger** mode.
2. Enter **Current Location** (via real browser geolocation) & **Destination**.
3. Choose transport mode: **🏍 Bike** or **🚗 Car**.
4. Set departure time: **Now** or **Scheduled Commute**.
5. Enable **Female-Only Commute** if eligible.
6. Trigger **Search**: The deterministic scanner scans nearby commuters across 4 compatibility tiers.
7. Review matched commuters with route overlap, estimated detour, destination gap, and fuel contribution.
8. Request/Confirm commute.
9. Undergo **Live Face Verification**.
10. Confirm physical presence within the **500m Pickup Geofence**.
11. View single-use **6-Digit Trip Start Code**.
12. Present code to Traveller at pickup.
13. Commute transitions to **IN_PROGRESS** with live tracking, trusted contact sharing, and persistent SOS.
14. Complete commute, review shared expense contribution, and submit trust rating.

### 3.2 Traveller Workflow ("Share My Commute")
1. Complete one-time **Traveller Verification** (Driving Licence, ID document, vehicle details).
2. Once status is **APPROVED**, select **Traveller** mode.
3. Enter origin, destination, vehicle capacity, available seats, and estimated fuel cost.
4. Publish the existing commute.
5. Review incoming passenger requests showing pickup deviation, drop deviation, and detour km.
6. Accept passenger.
7. Complete **Live Face Verification**.
8. Arrive at pickup area (verified by geofence).
9. Enter Passenger's 6-digit **Trip Start Code**.
10. System validates OTP; commute starts (`IN_PROGRESS`).
11. Live location broadcasted over secure Supabase Realtime channel.
12. Complete commute and offset personal fuel expenses.

---

## 🎯 4. Smart Matching Engine & 4 Match Types

PO → PO matches trips using PostGIS spatial queries combined with a pure deterministic scoring algorithm:

$$\text{Final Score} = (\text{Route Overlap} \times 0.35) + (\text{Pickup Proximity} \times 0.20) + (\text{Destination Proximity} \times 0.20) + (\text{Timing} \times 0.15) + (\text{Transport} \times 0.05) + (\text{Cost} \times 0.05)$$

> **Safety is NOT scored:** Safety filters (Account Verification, Approved Traveller, Female-Only) are strictly non-negotiable binary gates.

### The 4 Match Types (Section 45)
1. **EXACT DESTINATION**: Origin and destination closely match (highest compatibility).
2. **NEARBY DESTINATION**: Destination is within acceptable walking/first-last mile radius (displays destination gap).
3. **ROUTE CORRIDOR**: Passenger destination lies along the Traveller's active route corridor.
4. **ACCEPTABLE DETOUR**: Traveller route deviates by $\le 3\text{ km}$ to pick up or drop off the passenger.

*Smart Fallback:* PO → PO never displays "No rides found". If no exact destination matches exist, it automatically surfaces nearby alternatives and corridor commuters with calculated detours.

---

## 💰 5. P2P Shared Expense Model (No Surge)

$$\text{Total Travel Expense} = (\text{OSRM Distance} \times \text{Fuel Rate}) + \text{Tolls}$$

$$\text{Shared Cost Per Occupant} = \frac{\text{Total Travel Expense}}{\text{Actual Confirmed Occupants}}$$

$$\text{Passenger Total} = \text{Shared Cost Per Occupant} + \text{PO → PO Platform Fee (₹3)}$$

* Never divides by theoretical capacity; divides strictly by **actual confirmed occupants**.
* Traveller's personal travel expense is offset by the exact same amount.
* The ₹3 platform fee is displayed completely separately and never disguised as fuel cost.
* **No surge pricing, no commercial multipliers, no driver bidding.**

---

## 🛡️ 6. Multi-Layer Women's Safety Architecture

1. **Baseline Account Verification**: Every usable account is phone OTP verified and verified with a reference identity. The obsolete "Verified-only" toggle is permanently removed.
2. **Approved Traveller Verification**: Travellers must have an approved Driving Licence and vehicle registration before publishing a commute.
3. **Female-Only Commute**: Strict binary filter ensuring female commuters only match with verified female counterparties. Pro priority can **never** bypass this.
4. **Real Biometric Face Verification**:
   - Provider-agnostic 64-dimensional feature extraction and cosine similarity comparison against reference identity.
   - **Friend-Substitution Defense**: If Passenger A books and sends Friend B, face verification fails (`IDENTITY_MISMATCH`), locking the commute immediately.
5. **Single-Use Trip-Start OTP**:
   - Cryptographically secure 6-digit random code generated on the server.
   - Single-use, 5-minute expiry, max 5 attempts, rate limited, stored as a SHA-256 hash.
   - Cannot be generated until both parties pass face verification and are within the pickup geofence.
6. **Pickup Geofencing**: Validates that both parties are physically within 500m of the pickup point before unlocking trip start.
7. **Live Trip Sharing**: Secure tokenized tracking link shareable with WhatsApp or trusted emergency contacts.
8. **Trusted Contacts & Circles**: One-tap alert dispatch.
9. **Persistent Active-Trip SOS**: Instant emergency activation capturing live GPS and creating an auditable safety incident.
10. **Daily Ride Cap**: 2 rides per calendar day per user to enforce legitimate personal commuting.
11. **No-Show Penalty**: 10% penalty recorded if a passenger cancels after traveller departure or fails to show within 10 minutes.

---

## 💎 7. Plan System & Entitlements

| Plan | Monthly Fee | Features Included |
|---|---|---|
| **FREE** | ₹0 | Verified PO → PO community, AI-assisted route matching, Women-only pools, SOS & live trip safety, Basic impact tracking. |
| **VERIFIED** | ₹49 / month | Everything in Free + Enhanced identity verification badge, Trust Score breakdown, Recurring commute scheduling, Trusted circles, Advanced commute analytics. |
| **PRO** | ₹99 / month | Everything in Verified + AI Pool Rebalance, Predictive Demand heatmaps, Smart Pool Lock, Priority Matching (applied *only* after all safety filters), Priority Support. |

*Payment Gateway:* Integrated with **Razorpay in TEST MODE** (`rzp_test_*`). Live payment credentials are never used.

---

## 🏛️ 8. Supabase & PostGIS Architecture

* **Database Engine**: PostgreSQL 15+ with PostGIS extension for spatial computations (`ST_DWithin`, `ST_Distance`, `ST_LineLocatePoint`, `ST_MakeLine`).
* **Tables (19 Total)**:
  - `profiles`, `driver_profiles`, `driver_verifications`
  - `passenger_requests`, `traveller_commutes`, `matches`, `confirmed_trips`
  - `trip_locations`, `trip_identity_verifications`, `trip_start_otps`
  - `trusted_contacts`, `trusted_circles`, `sos_alerts`
  - `ratings`, `penalties`, `subscriptions`, `notifications`, `support_tickets`, `impact_metrics`
* **Row Level Security (RLS)**: Fine-grained access control on all tables. Sensitive biometrics and OTP hashes are never readable by client queries.
* **Storage Buckets (Private)**:
  - `profile-images`
  - `driver-documents`
  - `identity-assets`
* **Edge Functions (`supabase/functions/`)**:
  - `verify-face`: Biometric cosine similarity comparison against reference identity.
  - `generate-trip-start-otp`: Server-side geofence & face validation with SHA-256 hashed OTP generation.
  - `verify-trip-start-otp`: Rate-limited OTP verification triggering status transition to `IN_PROGRESS`.
  - `calculate-fare`: Pure P2P occupant expense division + platform fee.
  - `verify-driver`: Traveller compliance approval pipeline.
  - `find-matches`: Spatial PostGIS query retrieving candidates across the 4 match types.
* **Realtime**: Private authenticated channel `trip:<tripId>` using Broadcast for throttled GPS tracking and PostgreSQL CDC for status transitions.

---

## 🤖 9. Gemini AI Integration

Gemini AI is strictly employed to **explain** the deterministic match results to the user in natural language (e.g. detailing detour tradeoffs, carbon savings, and timing alignment).

> **Architectural Guardrail:** Gemini is never in the critical path of match creation, score calculation, safety gate enforcement, or pricing. It cannot override hard filters or capacity constraints.

---

## 🔍 10. Mocked vs. Real Architecture

| Feature | Implementation Status | Notes |
|---|---|---|
| **Supabase Phone OTP Auth** | **REAL** | Configured for Supabase Auth Phone OTP. |
| **Browser Geolocation** | **REAL** | Utilizes HTML5 `navigator.geolocation` with accuracy and timestamp metrics. |
| **OSRM Route Navigation** | **REAL** | Real route geometry, driving distance, and duration calculations. |
| **Deterministic Matching Engine** | **REAL** | Pure in-memory / PostGIS algorithm with 4 match types. |
| **Biometric Face Verification** | **REAL** | 64D feature extraction & cosine similarity. Flags friend substitutions. |
| **Trip-Start OTP** | **REAL** | Server-generated 6-digit random code, SHA-256 hashed, single use. |
| **Pickup Geofence Check** | **REAL** | Haversine / PostGIS 500m validation. |
| **Realtime Location Broadcast** | **REAL** | Throttled coordinates over Supabase Realtime channel. |
| **Razorpay Checkout** | **TEST MODE** | Tested with official Razorpay test keys (`rzp_test_*`). |
| **Govt DL Verification** | **SIMULATED (DEMO)** | Document verification is approved via hackathon demo workflow. |
| **Emergency Authority Dispatch** | **SIMULATED (DEMO)** | SOS dispatches in-app alerts and simulated SMS dispatch. |

---

## 🎨 11. Visual Identity & Styling

PO → PO features a dedicated visual identity with **no light/dark mode toggle**:

* **Primary Orange**: `#F63B03`
* **Bright Orange**: `#F73C06`
* **Cream**: `#FFF8E5`
* **Light Cream**: `#FBF6E2`
* **White**: `#FFFFFF`
* **Dust Pink**: `#E79E89`
* **Dark Brown**: `#4F1409`
* **Black**: `#0A0A0A`

Built using:
* **Liquid Glass UI Components**: `GlassSurface`, `GlassCard`, `GlassButton`, `GlassPill`, `GlassNav`, `GlassModal`, `GlassPanel`, `GlassControl`, `GlassStatus`.
* **ShaderGradient**: Ambient fluid background canvas.
* **React Three Fiber (R3F)**: Interactive 3D mobility node network on the Hero section.
* **Framer Motion**: High-fidelity cinematic page transitions, morphing cards, and pulse indicators.

---

## ⚖️ 12. Legal & Regulatory Compliance Disclaimer

> **PO → PO is designed around peer-to-peer existing-commute cost sharing.**  
> It does not provide commercial taxi or transport aggregator services. Real-world deployment must comply with applicable Tamil Nadu and Indian central motor vehicle regulations, vehicle insurance policies, licensing frameworks, information technology rules, and privacy legislation.

---

## ⚙️ 13. Setup & Development

### Prerequisites
* Node.js 18+
* Supabase CLI (optional for local edge functions)

### 1. Clone & Install
```bash
git clone <repository_url>
cd popo
npm run install:all
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials, Gemini API key, and Razorpay test credentials.

### 3. Run Automated Tests
```bash
npm test
```
Runs 34 tests across 5 suites covering deterministic matching, biometric face verification, friend-substitution defense, trip-start OTP, geofence validation, P2P expense sharing, and daily ride limits.

### 4. Run Development Servers
```bash
npm run dev
```
* **Frontend:** `http://localhost:5173`
* **Backend:** `http://localhost:5000`

---

## 🎭 14. Two-User Demo Walkthrough

1. **Step 1 — Register User A (Traveller)**:
   - Go to `/auth`, enter phone `+91 9876543210`, enter OTP `123456`.
   - Complete profile (Ananya, Female, upload selfie), choose **Passenger + Traveller**.
   - Navigate to `/trip/create`, click "Verify Traveller", submit Driving Licence & Bike details. (Instant hackathon approval).
   - Publish commute: Velachery to Guindy at 08:30 AM (Bike, 1 seat, ₹100 expense).

2. **Step 2 — Register User B (Passenger)**:
   - In an incognito window, open `/auth`, login with phone `+91 9876543222`.
   - Complete profile (Priya, Female, upload selfie), choose **Passenger**.
   - Search: Velachery to Guindy, Bike, Now.
   - View scanner animation → Results display **EXACT DESTINATION** match with Ananya (50% expense share = ₹50 + ₹3 platform fee).
   - Request and confirm commute.

3. **Step 3 — Security Check & Friend-Substitution Test**:
   - Both users are directed to `/trip/:id/active`.
   - Passenger Priya clicks "Verify Face" (Passes).
   - *Test Friend Substitution:* Click "Simulate Friend Substitution" → System returns `IDENTITY_MISMATCH` and blocks trip start.
   - Re-verify with Priya's authentic face → Verification passes.
   - Traveller Ananya completes face verification.

4. **Step 4 — Pickup Geofence & Trip-Start OTP**:
   - Both users arrive at pickup location (geofence verified).
   - Passenger Priya receives the 6-digit Trip Start Code (e.g. `482731`).
   - Traveller Ananya inputs `482731` and clicks "Verify & Start Commute".
   - Server validates hash and transitions trip to `IN_PROGRESS`.

5. **Step 5 — Active Commute & Completion**:
   - Live Leaflet map tracks position with orange route glow.
   - Passenger can click "Share Trip" or trigger SOS.
   - Click "Complete Commute" → Directed to `/trip/:id/complete` showing exact fuel offset breakdown and carbon reduction metrics.
