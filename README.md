# PO → PO — AI-Assisted Peer-to-Peer Ride-Sharing Platform

> **"THE MOST IMPRESSIVE EXPERIENCE THAT STILL FEELS FAST."**

PO → PO is a community-driven peer-to-peer mobility platform designed to tackle the urban commute and mobility crisis: high commuting costs, traffic congestion, half-empty private vehicles, overcrowded public transit, vehicular pollution, and safety concerns for women commuters.

PO → PO connects people traveling along compatible routes and times using a **pure deterministic compatibility engine** (route overlap, timing, capacity, budget) with **hard safety filters**, elevated by **Gemini AI mobility intelligence**, **Liquid Glass**, **ShaderGradient ambient aesthetics**, and a **React Three Fiber 3D mobility scene**.

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────┐
                    │     PO → PO Client      │
                    │ React 18 + Vite + TS    │
                    │ Tailwind + Liquid Glass │
                    │ R3F 3D + ShaderGradient │
                    │ Leaflet Dark Neon Map   │
                    └────────────┬────────────┘
                                 │ HTTP / REST + Socket.io
                    ┌────────────▼────────────┐
                    │     Express Backend     │
                    │ Node.js + JWT + Sockets │
                    └──────┬──────┬─────┬─────┘
                           │      │     │
         ┌─────────────────┘      │     └──────────────────┐
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌───────────────────┐
│     MongoDB      │    │   OSRM Engine    │    │    Gemini AI      │
│ GeoJSON 2dsphere │    │ Route Geometries │    │ Match Explanation │
│ Users, Trips, SOS│    │ Distances & Time │    │ Anomaly Detection │
└──────────────────┘    └──────────────────┘    └───────────────────┘
```

### Authoritative Matching Pipeline
```
CANDIDATE RETRIEVAL ──► SAFETY HARD FILTER ──► ELIGIBILITY FILTER ──► DETERMINISTIC SCORE ──► PRO PRIORITY ADJUSTMENT ──► RANK ──► GEMINI EXPLANATION
```

### Authoritative Trip-Start Pipeline
```
MATCH ACCEPTED ──► DRIVER FACE VERIFIED + PASSENGER FACE VERIFIED ──► START TRIP (IN_PROGRESS)
```

### Authoritative Fare Pipeline
```
OSRM DISTANCE ──► Distance × Fuel Rate ──► + Tolls ──► ÷ Total Occupants ──► Pool Fare ──► Platform Commission ──► Final Amount
```

---

## ⚡ Quickstart Setup (< 10 Minutes)

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port 27017 (or MongoDB Atlas URI)

### 1. Install Dependencies
```bash
# In project root
npm run install:all
```

### 2. Configure Environment
Create `.env` inside `popo/server` (or root):
```env
MONGODB_URI=mongodb://localhost:27017/popo
JWT_SECRET=popo-super-secret-jwt-key
PORT=5000
CLIENT_URL=http://localhost:5173
OSRM_URL=https://router.project-osrm.org

# Optional:
GEMINI_API_KEY=your_gemini_api_key_here
RAZORPAY_KEY_ID=rzp_test_mock
RAZORPAY_KEY_SECRET=rzp_test_secret
```

### 3. Seed Realistic Chennai Demo Data
Populates Chennai commuters across Guindy, T. Nagar, Velachery, Adyar, OMR, etc.:
```bash
npm run seed
```

### 4. Start Development Servers
```bash
# Starts Express on :5000 and Vite on :5173
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🧪 Automated Test Suite

Run unit and integration tests covering deterministic matching, safety hard gates, fare calculations, daily ride limits, no-shows, and socket routing:
```bash
npm test
```
All test suites run pure, deterministic logic with 100% pass rate.

---

## 📊 Real vs Mocked Matrix

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **JWT Authentication** | **Real** | Signed tokens, bearer header validation |
| **Phone OTP** | **Mocked** | Generated OTP logged to server console (default `123456`) |
| **Route Calculation** | **Real** | OSRM public API routing with actual geometry coordinates |
| **Map Rendering** | **Real** | Leaflet with CartoDB Dark Matter tiles & custom PO → PO markers |
| **Matching Engine** | **Real** | Deterministic geometry overlap, time window, capacity & budget |
| **Safety Gates** | **Real** | Hard exclusion before scoring (verified-only, women-only) |
| **Face Verification** | **Mocked** | Live camera viewfinder + simulated liveness detection |
| **Government KYC** | **Mocked** | Simulated identity verification badge |
| **Trusted Contacts** | **Real** | Stored in MongoDB, linked to user profiles |
| **Contact Notifications** | **Mocked** | Simulated SMS delivery logged to console |
| **SOS Emergency Alert** | **Real** | MongoDB SOS records with timestamp and geolocation |
| **SOS Telecom Dispatch** | **Mocked** | Simulated emergency services integration |
| **Gemini Explanations** | **Real API** | Generates human-readable match breakdowns (with local fallback) |
| **Anomaly Detection** | **Gemini-Assisted** | Route detour and delay analysis |
| **Razorpay Checkout** | **TEST MODE** | Plan upgrades with test credentials or simulated flow |
| **Daily Ride Limit** | **Real** | Server-enforced 2 rides/day per user |
| **No-Show Penalty** | **Real** | Configurable cancellation penalty calculation & penalty records |
| **Live Location Sharing**| **Real** | Socket.io room broadcasts between driver and rider |

---

## 🎬 Judge Demo Walkthrough (Two Windows / Devices)

Use two browser windows (or one incognito window) to demonstrate the complete peer-to-peer journey:

### Window A: Driver (e.g. Rahul Kumar - Phone `9876543211` or Post New)
1. **Login**: Enter phone `9876543211`, enter OTP `123456`.
2. **Personalized Home**: Switch role toggle to **Driver**. Click **Post a Ride**.
3. **Trip Creation**:
   - Origin: Tap **Guindy**
   - Destination: Tap **OMR**
   - Seats: 3, Budget: ₹40 - ₹100
   - Live route preview displays on map.
   - Click **Post Ride**.

### Window B: Passenger (e.g. Priya Sharma - Phone `9876543210`)
1. **Login**: Enter phone `9876543210`, enter OTP `123456`.
2. **Find a Ride**: Click **Find a Ride**.
   - Origin: Tap **Guindy**
   - Destination: Tap **OMR**
   - Check **Verified riders only**.
   - Click **Find Rides**.
3. **Matching Engine & Gemini Explanation**:
   - Animated matching engine processes candidates.
   - View compatibility card: Route Overlap, Time Tolerance, Seats, Budget.
   - Read Gemini AI Match Explanation.
   - Click **Accept Match**.

### Both Windows: Face Verification & Live Trip
4. **Identity Verification**:
   - Both driver and passenger undergo simulated selfie camera check.
   - The trip will NOT start until both parties are verified.
5. **Active Live Trip**:
   - Live Dark Neon Map with route polyline and moving vehicle marker.
   - Tap **Share Trip** to generate a public live tracking token link.
   - Open link to view public tracking map.
   - Press and hold **SOS** to activate emergency protocol (logged to backend).
6. **Trip Completion & Fare Breakdown**:
   - Click **Complete Trip**.
   - Transparent Fare Formula displayed:
     $$\text{Fare} = \frac{\text{Distance} \times \text{Fuel Rate} + \text{Tolls}}{\text{Total Occupants}}$$
   - Separate platform commission line item.
   - Submit 5-star rating & view Trust Score increase.

### Window A/B: Plans & Tier Gating
7. **Monetization**:
   - Visit **Plans** page (`/plans`).
   - View **FREE** (₹0), **VERIFIED** (₹49/mo), and **PRO** (₹99/mo).
   - Test upgrading to PRO. Features unlock immediately with animated badges.
   - PRO users receive ranking preference, but **NEVER bypass safety filters**.

---

## 🎨 Visual System & Technology Stack

- **Styling**: Tailwind CSS + Custom CSS Theme Tokens (`#06060c` deep dark base, electric cyan `#00d4ff`, violet `#7b61ff`, mint green `#00ffa3`).
- **Liquid Glass**: Translucent, frosted glass cards, navigation, and modals with refraction and specular border highlights.
- **ShaderGradient**: Ambient fluid iridescent visual layer responsive to motion.
- **React Three Fiber (R3F)**: 3D mobility scene with dynamic route bezier curves, vehicle nodes, and particle fields.
- **Leaflet**: Customized CartoDB Dark Matter tiles with glowing DivIcons.
