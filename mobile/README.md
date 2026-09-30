# PO → PO Native Flutter Android Application

> **"Don't book a ride. Find someone already going your way."**
> 
> PO → PO is a peer-to-peer existing-commute cost-sharing platform connecting travellers and passengers travelling in the same direction. It is **NOT** a commercial taxi or cab marketplace—there is no surge pricing, no driver bidding, and no profit optimization. Only shared travel expenses (fuel and toll contributions).

---

## 1. System Architecture

```
Flutter Android Application (Dart with Sound Null Safety)
        │
        ├── State Management: Modern Riverpod / ValueNotifiers / Repositories
        ├── Navigation: Declarative Tab & Route Navigation
        ├── Design Language: PO → PO Liquid Glass Dark Identity
        │
        ▼
Authoritative Supabase Backend (https://jdmvqjtdiimugwuvcddd.supabase.co)
        ├── Supabase Auth (Phone OTP Authentication)
        ├── PostgreSQL & PostGIS (Spatial queries, route corridors)
        ├── Supabase Storage (Private document & verification buckets)
        ├── Supabase Realtime (Live commuter tracking & trip broadcast)
        ├── Row Level Security (RLS enforcing participant isolation)
        │
        ├── Google Places / Maps (Canonical location discovery & display names)
        ├── OSRM (Route matching, overlap, and detour calculation)
        └── Test Payment Gateway (Razorpay Test Mode)
```

---

## 2. Visual Identity & Design Tokens

PO → PO follows a unified dark-mode liquid-glass aesthetic as defined in the official design specifications:

| Token Name | Hex Code | Purpose |
|---|---|---|
| `obsidian` / Background | `#0A0A0A` | Deep dark foundation |
| `primaryOrange` | `#F63B03` | Primary brand accent & call-to-actions |
| `brightOrange` | `#F73C06` | Glows, route indicators, selected states |
| `deepBrown` | `#4F1409` | Warm shadows and container backgrounds |
| `cream` | `#FFF8E5` | Primary headings, titles, and high-contrast text |
| `lightCream` | `#FBF6E2` | Secondary headers and readable cards |
| `dustPink` | `#E79E89` | Warm secondary accents and subtitles |
| `glassSurface` | `rgba(255, 255, 255, 0.04)` | Translucent frosted glass layer |
| `glassBorder` | `rgba(255, 255, 255, 0.10)` | Crisp 1px glass containment border |
| `glassBorderOrange` | `rgba(246, 59, 3, 0.35)` | Active glowing borders |

### Reusable Glass Components (`lib/shared/widgets/`)
- `POGlassCard`: Frosted glass container with subtle blur and optional orange edge highlight.
- `POGlassButton`: High-visibility button with electric orange gradient and glow.
- `POGlassPill`: Compact rounded badge for tags, match scores, and status chips.
- `POGlassSegment`: Toggle controller with smooth spring sliding indicator.
- `POGlassNav`: Floating liquid glass bottom navigation bar with elevated glowing central `+` action button.

---

## 3. Screen Inventory & User Journeys

### 1. Home Screen (`lib/screens/home_screen.dart`)
- **Reference Fidelity**: Implements the layout, spacing, and visual hierarchy of the official Android Home Screen reference image.
- **Header**: Live user profile greeting, verified PO → PO member indicator, and active plan badge (`PRO` / `VERIFIED` / `FREE`).
- **Impact Summary**: Verified CO₂ savings metric from actual completed rides (empty state shown if no trips taken).
- **Hero & Mode Switch**: "Find someone going your way" tagline with segmented control switching between `Find a Ride` and `Share My Commute`.
- **Map Section**: Integrated dark-styled map with user's current GPS position, route previews, and verified nearby commuter markers.
- **Current Location Card**: Displays live geocoded location with manual fallback option.
- **Quick Destinations**: Instant shortcuts (Guindy, Velachery, T. Nagar, OMR Sholinganallur).
- **Active Commuters Card**: Real-time count of compatible commuters currently on the network.
- **Women-Only Commute Card**: Safety toggle enforcing backend hard-filtering for female participants.
- **Floating Navigation**: Home, Trips, Central `+` Action (Action Sheet modal), Plans, and Profile.

### 2. Passenger Journey — Find a Ride (`lib/screens/find_ride_screen.dart`)
- **Location Discovery**: Destination autocomplete powered by Google Places.
- **Clean Display Name**: Extracts only canonical place names (e.g., "SRM Easwari Engineering College") in primary fields, preventing unwieldy formatted addresses from cluttering the UI while saving full coordinates and place IDs internally.
- **Transport Selection**: Peer-to-peer personal vehicle modes only: `BIKE` and `CAR`. Never commercial cabs, autos, or taxis.

### 3. Traveller Journey — Share My Commute (`lib/screens/share_commute_screen.dart`)
- Origin, destination, vehicle type, and available empty seats specification.
- Direct publishing to Supabase `traveller_commutes`.
- **Zero Quota Consumption**: Creating or searching for rides consumes **0** daily quota until a match is officially confirmed.

### 4. Deterministic Matching Engine (`lib/screens/matches_screen.dart`)
- Strictly deterministic multi-factor match calculation:
  - **90–100%**: *Excellent match*
  - **80–89%**: *Strong match*
  - **60–79%**: *Compatible commute*
  - **40–59%**: *Weak compatibility*
  - **< 40%**: *Excluded / Rejected from results*
- Displays route overlap percentage, detour distance (km), timing gap, and fair cost-sharing breakdown.

### 5. Active Trip & Safety Flow (`lib/screens/active_trip_screen.dart`)
- **Camera Permission**: Requested contextually *only* at the verification step, never at app launch.
- **Face Verification & Friend Substitution Prevention**: Verifies passenger and traveller against reference identity. If passenger mismatch occurs, returns `IDENTITY_MISMATCH` and terminates flow.
- **Pickup Geofence**: Validates that both parties are within 500 meters of the agreed pickup coordinate before trip start is permitted.
- **Trip Start OTP**: Single-use 6-digit cryptographic code (Passenger displays code, Traveller inputs code, backend validates, 5 attempt limit). Correct OTP cannot bypass a failed identity check.
- **Live Trip Broadcast**: Throttled realtime telemetry broadcast via Supabase Realtime channels.
- **Persistent SOS**: One-touch emergency safety alert capturing live GPS, trip ID, and timestamp.

### 6. Profile & Authoritative Trust Score (`lib/screens/profile_screen.dart`)
- **Real Trust Score**: Deterministically computed from 6 objective factors:
  1. Identity Document Verification
  2. Approved Traveller Status
  3. Completed Rides History
  4. Average Community Rating
  5. Low Cancellation Rate
  6. Zero Unresolved Safety Reports
- **Full Transparency ("Why this score?")**: Break down each point contributor. Trust Score is never hardcoded.
- **Daily Commute Quota**: Server-enforced daily allowance (2 confirmed shared commutes per calendar day). Unmatched or expired requests consume 0 quota.

### 7. Commute Plans & Fair Contribution (`lib/screens/plans_screen.dart`)
- **FREE (₹0)**: Verified community, route matching, women-only commute option, SOS live safety.
- **VERIFIED (₹49/mo)**: Enhanced trust verification, verified badge, recurring commute routes, trust circles.
- **PRO (₹99/mo)**: Priority corridor matching, smart pool lock, predictive demand insights, premium support.
- Simulated Razorpay Test Mode checkout with server verification.

---

## 4. Android App Icon & Branding Assets

All branding assets are verified true PNG format (`89 50 4E 47` magic bytes) and reside in:

```
mobile/
├── assets/
│   └── branding/
│       ├── po_to_po_logo.png           # Full PO → PO brand lockup with route arrow
│       ├── po_to_po_logo_mark.png      # Minimal icon mark for avatars and headers
│       └── po_to_po_logo_wordmark.png  # Wordmark typography
└── android/app/src/main/res/
    ├── mipmap-mdpi/ic_launcher.png     (48x48)
    ├── mipmap-hdpi/ic_launcher.png     (72x72)
    ├── mipmap-xhdpi/ic_launcher.png    (96x96)
    ├── mipmap-xxhdpi/ic_launcher.png   (144x144)
    └── mipmap-xxxhdpi/ic_launcher.png  (192x192)
```

---

## 5. Automated Test Matrix

The test suite validates the core business logic, safety constraints, and quota rules:

```bash
flutter test
```

### Passing Test Suites:
1. `POPOApp boots and displays PO → PO Home navigation`: Validates bottom navigation bar, floating `+` button, and initial home screen rendering.
2. `Daily Ride Limit logic strictly consumes quota only for confirmed rides`: Validates that `SEARCHING`, `CREATED`, and `NO_MATCH` consume `0` quota, `CONFIRMED` consumes `1`, and cancellation restores quota.
3. `Deterministic Match Score grading`: Validates score tiering (>=90 Excellent, 80-89 Strong, 60-79 Compatible, 40-59 Weak, <40 Rejected).
4. `Real Trust Score calculation`: Validates 6-factor calculation engine without hardcoded values.
5. `Identity Verification & Friend Substitution Prevention`: Validates that person mismatch results in `IDENTITY_MISMATCH` and blocks OTP generation.

---

## 6. Build Artifacts

The application builds cleanly for both Debug and optimized Release targets:

| Artifact | Path | Size | Description |
|---|---|---|---|
| **Debug APK** | `build/app/outputs/flutter-apk/app-debug.apk` | **~150 MB** | Full debug symbols, JIT compilation |
| **Release APK** | `build/app/outputs/flutter-apk/app-release.apk` | **52.2 MB** | AOT compiled, R8 minified, tree-shaken |

---

## 7. Build & Run Commands

### 1. Install Dependencies
```bash
cd mobile
flutter pub get
```

### 2. Run Static Analyzer
```bash
flutter analyze
```

### 3. Run Automated Tests
```bash
flutter test
```

### 4. Build Android APKs
```bash
# Debug APK
flutter build apk --debug

# Release APK (Production-ready)
flutter build apk --release
```

### 5. Install on Connected Device or Emulator
```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```
