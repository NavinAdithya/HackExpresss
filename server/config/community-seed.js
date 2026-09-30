/**
 * Demo seed data for Communities and Daily Commutes (Chennai).
 * Shared by the in-memory demo store and server/seed.js so both stay in sync.
 * Members are referenced by demo phone number.
 */

const COMMUNITY_SEED = [
  { key: 'srm', name: 'SRM Ramapuram', category: 'COLLEGE', description: 'Students and staff travelling to SRM Ramapuram.', members: ['9876543210', '9876543211', '9876543212', '9876543213'] },
  { key: 'srm-cse', name: 'SRM Ramapuram — Computer Science', category: 'COLLEGE', description: 'CSE department commuters.', members: ['9876543210', '9876543212'] },
  { key: 'ramapuram', name: 'Ramapuram Commuters', category: 'COLLEGE', description: 'Everyone heading to Ramapuram in the morning.', members: ['9876543210', '9876543211', '9876543212'] },
  { key: 'dlf', name: 'DLF IT Park Porur', category: 'OFFICE', description: 'Office commuters to DLF IT Park, Porur.', members: ['9876543210', '9876543213'] },
  { key: 'omr', name: 'OMR Tech Park Commuters', category: 'OFFICE', description: 'IT corridor commuters along OMR.', members: ['9876543211', '9876543213'] },
  { key: 'porur-ramapuram', name: 'Porur → Ramapuram', category: 'ROUTE', description: 'Regular route: Porur to Ramapuram.', members: ['9876543210', '9876543211', '9876543212'] },
  { key: 'guindy-omr', name: 'Guindy → OMR', category: 'ROUTE', description: 'Regular route: Guindy to OMR.', members: ['9876543211', '9876543213'] },
  { key: 'cyber-club', name: 'SRM Cybersecurity Club', category: 'ORGANIZATION', description: 'Club members sharing rides to events and campus.', members: ['9876543212', '9876543213'] },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Coordinates are [lng, lat]
const PLACES = {
  porur: { address: 'Porur', coordinates: [80.1565, 13.0382] },
  porurJn: { address: 'Porur Junction', coordinates: [80.1600, 13.0370] },
  ramapuram: { address: 'SRM Ramapuram', coordinates: [80.1800, 13.0327] },
  guindy: { address: 'Guindy', coordinates: [80.2206, 13.0067] },
  omr: { address: 'OMR Tech Park', coordinates: [80.2340, 12.9400] },
};

const COMMUTE_SEED = [
  { phone: '9876543210', label: 'College', origin: PLACES.porur, destination: PLACES.ramapuram, departureTime: '08:10', role: 'BOTH', transportMode: 'CAR', availableSeats: 2, requiredSeats: 1, days: WEEKDAYS },
  { phone: '9876543211', label: 'College run', origin: PLACES.porurJn, destination: PLACES.ramapuram, departureTime: '08:20', role: 'TRAVELLER', transportMode: 'BIKE', availableSeats: 1, requiredSeats: 1, days: WEEKDAYS },
  { phone: '9876543213', label: 'Office', origin: PLACES.guindy, destination: PLACES.omr, departureTime: '08:15', role: 'TRAVELLER', transportMode: 'CAR', availableSeats: 3, requiredSeats: 1, days: WEEKDAYS },
  { phone: '9876543212', label: 'College', origin: PLACES.porur, destination: PLACES.ramapuram, departureTime: '08:15', role: 'PASSENGER', transportMode: 'CAR', availableSeats: 0, requiredSeats: 1, days: WEEKDAYS },
];

/**
 * Derive five 1–10 parameters from a legacy 1–5 star seed rating (deterministic).
 * Demo seed only — real ratings come exclusively from POST /api/ratings.
 */
function dimsFromStars(stars, salt = 0) {
  const base = stars * 2;
  const params = ['reliability', 'safety', 'respect', 'routeCommitment', 'communication'];
  const out = {};
  params.forEach((p, i) => {
    out[p] = Math.max(1, Math.min(10, base - ((salt + i) % 3 === 0 ? 1 : 0)));
  });
  return out;
}

/** Straight-line route with intermediate points (used only for offline demo seeds). */
function straightRoute(a, b, steps = 6) {
  const coordinates = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    coordinates.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return { type: 'LineString', coordinates };
}

module.exports = { COMMUNITY_SEED, COMMUTE_SEED, dimsFromStars, straightRoute, WEEKDAYS };
