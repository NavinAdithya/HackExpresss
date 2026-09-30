/**
 * Seed Script — Chennai demo data
 *
 * Populates the database with realistic test data around Chennai.
 * Usage: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Trip = require('./models/Trip');
const Rating = require('./models/Rating');
const Community = require('./models/Community');
const CommunityMember = require('./models/CommunityMember');
const DailyCommute = require('./models/DailyCommute');
const { COMMUNITY_SEED, COMMUTE_SEED, dimsFromStars, straightRoute } = require('./config/community-seed');
const { tripRatingOverall, refreshBehaviorTrust } = require('./services/behavior-trust');
const { calculateRoute } = require('./services/route-service');
const { computeUserTrustScore } = require('./services/trust-score');

// Real Chennai locations
const CHENNAI = {
  guindy: { lat: 13.0067, lng: 80.2206, name: 'Guindy' },
  tNagar: { lat: 13.0418, lng: 80.2341, name: 'T. Nagar' },
  velachery: { lat: 12.9815, lng: 80.2180, name: 'Velachery' },
  adyar: { lat: 13.0012, lng: 80.2565, name: 'Adyar' },
  tambaram: { lat: 12.9249, lng: 80.1000, name: 'Tambaram' },
  annaNagar: { lat: 13.0850, lng: 80.2101, name: 'Anna Nagar' },
  omr: { lat: 12.9400, lng: 80.2340, name: 'OMR Tech Park' },
  besantNagar: { lat: 13.0002, lng: 80.2668, name: 'Besant Nagar' },
  mylapore: { lat: 13.0368, lng: 80.2676, name: 'Mylapore' },
  kodambakkam: { lat: 13.0525, lng: 80.2248, name: 'Kodambakkam' },
};

const SEED_USERS = [
  {
    name: 'Priya Sharma',
    phone: '9876543210',
    gender: 'female',
    verified: true,
    driverStatus: 'APPROVED',
    plan: 'VERIFIED',
    subscriptionStatus: 'ACTIVE',
    womenOnly: false,
    verifiedOnly: true,
    trustedContacts: [
      { name: 'Mom', phone: '9876543200', circle: 'Family' },
      { name: 'Dad', phone: '9876543201', circle: 'Family' },
    ],
  },
  {
    name: 'Rahul Kumar',
    phone: '9876543211',
    gender: 'male',
    verified: true,
    driverStatus: 'APPROVED',
    plan: 'PRO',
    subscriptionStatus: 'ACTIVE',
    womenOnly: false,
    verifiedOnly: false,
    trustedContacts: [
      { name: 'Wife', phone: '9876543220', circle: 'Family' },
    ],
  },
  {
    name: 'Ananya Iyer',
    phone: '9876543212',
    gender: 'female',
    verified: true,
    driverStatus: 'NOT_REQUESTED',
    plan: 'VERIFIED',
    subscriptionStatus: 'ACTIVE',
    womenOnly: true,
    verifiedOnly: true,
    trustedContacts: [
      { name: 'Sister', phone: '9876543230', circle: 'Family' },
      { name: 'Best Friend', phone: '9876543231', circle: 'Friends' },
    ],
  },
  {
    name: 'Vikram Rajan',
    phone: '9876543213',
    gender: 'male',
    verified: true,
    driverStatus: 'APPROVED',
    plan: 'FREE',
    subscriptionStatus: 'FREE',
    womenOnly: false,
    verifiedOnly: false,
    trustedContacts: [],
  },
  {
    name: 'Deepa Murthy',
    phone: '9876543214',
    gender: 'female',
    verified: false,
    driverStatus: 'NOT_REQUESTED',
    plan: 'FREE',
    subscriptionStatus: 'FREE',
    womenOnly: false,
    verifiedOnly: false,
    trustedContacts: [
      { name: 'Brother', phone: '9876543240', circle: 'Family' },
    ],
  },
  {
    name: 'Arjun Nair',
    phone: '9876543215',
    gender: 'male',
    verified: true,
    driverStatus: 'APPROVED',
    plan: 'PRO',
    subscriptionStatus: 'ACTIVE',
    womenOnly: false,
    verifiedOnly: false,
    trustedContacts: [
      { name: 'Mom', phone: '9876543250', circle: 'Family' },
    ],
  },
];

const SEED_TRIPS = [
  // Drivers
  {
    userIndex: 1, // Rahul
    role: 'driver',
    origin: CHENNAI.annaNagar,
    destination: CHENNAI.omr,
    seatCount: 3,
    budgetMin: 30,
    budgetMax: 80,
    timeOffset: 1, // hours from now
  },
  {
    userIndex: 3, // Vikram
    role: 'driver',
    origin: CHENNAI.tNagar,
    destination: CHENNAI.velachery,
    seatCount: 2,
    budgetMin: 20,
    budgetMax: 60,
    timeOffset: 2,
  },
  {
    userIndex: 5, // Arjun
    role: 'driver',
    origin: CHENNAI.kodambakkam,
    destination: CHENNAI.adyar,
    seatCount: 3,
    budgetMin: 25,
    budgetMax: 70,
    timeOffset: 1.5,
  },
  // Passengers
  {
    userIndex: 0, // Priya
    role: 'passenger',
    origin: CHENNAI.annaNagar,
    destination: CHENNAI.guindy,
    seatCount: 1,
    budgetMin: 20,
    budgetMax: 60,
    timeOffset: 1,
  },
  {
    userIndex: 2, // Ananya
    role: 'passenger',
    origin: CHENNAI.mylapore,
    destination: CHENNAI.velachery,
    seatCount: 1,
    budgetMin: 15,
    budgetMax: 50,
    timeOffset: 2,
    womenOnly: true,
    verifiedOnly: true,
  },
  {
    userIndex: 4, // Deepa
    role: 'passenger',
    origin: CHENNAI.besantNagar,
    destination: CHENNAI.tambaram,
    seatCount: 1,
    budgetMin: 30,
    budgetMax: 100,
    timeOffset: 3,
  },
];

async function seed() {
  try {
    await connectDB();
    console.log('\n🌱 Seeding PO → PO database...\n');

    // Clear existing data
    await User.deleteMany({});
    await Trip.deleteMany({});
    await Rating.deleteMany({});
    await Community.deleteMany({});
    await CommunityMember.deleteMany({});
    await DailyCommute.deleteMany({});
    console.log('  ✓ Cleared existing data');

    // Create users
    const users = [];
    for (const userData of SEED_USERS) {
      const user = await User.create(userData);
      users.push(user);
      console.log(`  ✓ Created user: ${user.name} (${user.plan})`);
    }

    // Create trips with real OSRM routes
    const trips = [];
    for (const tripData of SEED_TRIPS) {
      const user = users[tripData.userIndex];
      const origin = tripData.origin;
      const dest = tripData.destination;

      let routeData;
      try {
        routeData = await calculateRoute(
          [origin.lng, origin.lat],
          [dest.lng, dest.lat]
        );
        console.log(`  ✓ Route: ${origin.name} → ${dest.name} (${(routeData.distance / 1000).toFixed(1)} km)`);
      } catch (err) {
        console.log(`  ⚠ Route failed for ${origin.name} → ${dest.name}, using placeholder`);
        routeData = {
          geometry: {
            type: 'LineString',
            coordinates: [[origin.lng, origin.lat], [dest.lng, dest.lat]],
          },
          distance: 10000,
          duration: 1800,
        };
      }

      const departureTime = new Date();
      departureTime.setHours(departureTime.getHours() + tripData.timeOffset);

      const trip = await Trip.create({
        userId: user._id,
        role: tripData.role,
        origin: {
          address: origin.name,
          location: { type: 'Point', coordinates: [origin.lng, origin.lat] },
        },
        destination: {
          address: dest.name,
          location: { type: 'Point', coordinates: [dest.lng, dest.lat] },
        },
        route: routeData.geometry,
        routeDistance: routeData.distance,
        routeDuration: routeData.duration,
        departureTime,
        timeWindow: 30,
        seatCount: tripData.seatCount,
        budgetMin: tripData.budgetMin,
        budgetMax: tripData.budgetMax,
        verifiedOnly: tripData.verifiedOnly || false,
        womenOnly: tripData.womenOnly || false,
      });

      trips.push(trip);
    }

    // Create some ratings
    // Completed trip simulation: Priya rated Rahul
    await Rating.create({
      rater: users[0]._id,
      ratedUser: users[1]._id,
      trip: trips[0]._id,
      rating: 5,
      ...dimsFromStars(5, 0),
      overall: tripRatingOverall(dimsFromStars(5, 0)),
      comment: 'Very safe driver, arrived on time!',
    });

    await Rating.create({
      rater: users[1]._id,
      ratedUser: users[0]._id,
      trip: trips[0]._id,
      rating: 4,
      ...dimsFromStars(4, 1),
      overall: tripRatingOverall(dimsFromStars(4, 1)),
      comment: 'Great co-passenger, friendly conversation.',
    });

    console.log('  ✓ Created sample ratings');

    // Communities + memberships
    const userByPhone = {};
    users.forEach((u) => { userByPhone[u.phone] = u; });
    for (const c of COMMUNITY_SEED) {
      const community = await Community.create({
        name: c.name, slug: c.key, category: c.category, description: c.description, memberCount: 0,
      });
      let count = 0;
      for (const phone of c.members) {
        if (!userByPhone[phone]) continue;
        await CommunityMember.create({ communityId: community._id, userId: userByPhone[phone]._id });
        count++;
      }
      community.memberCount = count;
      await community.save();
    }
    console.log(`  ✓ Created ${COMMUNITY_SEED.length} communities`);

    // Recurring commutes (offline straight-line routes; real routes are computed when users save commutes)
    for (const c of COMMUTE_SEED) {
      const u = userByPhone[c.phone];
      if (!u) continue;
      await DailyCommute.create({
        userId: u._id, label: c.label,
        origin: { address: c.origin.address, location: { type: 'Point', coordinates: c.origin.coordinates } },
        destination: { address: c.destination.address, location: { type: 'Point', coordinates: c.destination.coordinates } },
        route: straightRoute(c.origin.coordinates, c.destination.coordinates),
        routeDistance: 9000, routeDuration: 1200,
        departureTime: c.departureTime, days: c.days, role: c.role, transportMode: c.transportMode,
        availableSeats: c.availableSeats, requiredSeats: c.requiredSeats,
      });
    }
    console.log(`  ✓ Created ${COMMUTE_SEED.length} recurring commutes`);

    // Recompute authoritative deterministic trust scores from seeded activity
    for (const u of users) {
      const res = await computeUserTrustScore(u._id);
      console.log(`  ✓ Trust score computed: ${u.name} → ${res.score}/100 (${res.tier})`);
      await refreshBehaviorTrust(u._id);
    }

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║  🌱 Seed complete!                        ║');
    console.log(`║  Users: ${users.length}                                ║`);
    console.log(`║  Trips: ${trips.length}                                ║`);
    console.log('║                                          ║');
    console.log('║  Demo accounts:                          ║');
    SEED_USERS.forEach((u) => {
      console.log(`║  📱 ${u.phone} — ${u.name.padEnd(16)} ${u.plan.padEnd(4)}  ║`);
    });
    console.log('╚══════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
