/**
 * In-Memory Database Fallback for PO → PO
 *
 * Automatically activated when local MongoDB is not running.
 * Allows the entire application to run out-of-the-box for hackathon demos
 * without requiring MongoDB installation.
 *
 * Pre-populates with realistic Chennai commuters and trips.
 */

const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

// In-memory data collections
const store = {
  users: [],
  trips: [],
  matches: [],
  ratings: [],
  sosAlerts: [],
  penalties: [],
};

// Seed Chennai demo data
function seedInitialData() {
  const user1Id = '66f000000000000000000001';
  const user2Id = '66f000000000000000000002';
  const user3Id = '66f000000000000000000003';
  const user4Id = '66f000000000000000000004';
  const user5Id = '66f000000000000000000005';

  store.users = [
    {
      _id: user1Id,
      name: 'Priya Sharma',
      phone: '9876543210',
      gender: 'female',
      verified: true,
      accountVerified: true,
      driverStatus: 'APPROVED',
      rolePreference: 'BOTH',
      plan: 'VERIFIED',
      subscriptionStatus: 'ACTIVE',
      womenOnly: false,
      dailyRideCount: 0,
      dailyRideDate: new Date(),
      trustedContacts: [
        { name: 'Mom', phone: '9876543200', circle: 'Family' },
        { name: 'Dad', phone: '9876543201', circle: 'Family' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: user2Id,
      name: 'Rahul Kumar',
      phone: '9876543211',
      gender: 'male',
      verified: true,
      accountVerified: true,
      driverStatus: 'APPROVED',
      rolePreference: 'TRAVELLER',
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      womenOnly: false,
      dailyRideCount: 0,
      dailyRideDate: new Date(),
      trustedContacts: [
        { name: 'Wife', phone: '9876543220', circle: 'Family' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: user3Id,
      name: 'Ananya Iyer',
      phone: '9876543212',
      gender: 'female',
      verified: true,
      accountVerified: true,
      driverStatus: 'NOT_REQUESTED',
      rolePreference: 'PASSENGER',
      plan: 'VERIFIED',
      subscriptionStatus: 'ACTIVE',
      womenOnly: true,
      dailyRideCount: 0,
      dailyRideDate: new Date(),
      trustedContacts: [
        { name: 'Sister', phone: '9876543230', circle: 'Family' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: user4Id,
      name: 'Vikram Rajan',
      phone: '9876543213',
      gender: 'male',
      verified: true,
      accountVerified: true,
      driverStatus: 'APPROVED',
      rolePreference: 'BOTH',
      plan: 'FREE',
      subscriptionStatus: 'FREE',
      womenOnly: false,
      dailyRideCount: 0,
      dailyRideDate: new Date(),
      trustedContacts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Seed completed historical commutes to reflect genuine user activity
  const completedTripsData = [
    { u: user1Id, m: user2Id, r: 'driver', orig: 'Guindy', dest: 'Velachery', dist: 8500 },
    { u: user1Id, m: user3Id, r: 'driver', orig: 'Velachery', dest: 'OMR Tech Park', dist: 12400 },
    { u: user1Id, m: user4Id, r: 'driver', orig: 'T. Nagar', dest: 'SRM Easwari', dist: 10200 },
    { u: user1Id, m: user2Id, r: 'driver', orig: 'Anna Nagar', dest: 'Guindy', dist: 14000 },
    { u: user1Id, m: user3Id, r: 'driver', orig: 'Guindy', dest: 'DLF Porur', dist: 9500 },
    { u: user1Id, m: user4Id, r: 'driver', orig: 'OMR', dest: 'Adyar', dist: 8000 },
    { u: user2Id, m: user1Id, r: 'driver', orig: 'Guindy', dest: 'OMR Tech Park', dist: 12400 },
    { u: user2Id, m: user3Id, r: 'driver', orig: 'Guindy', dest: 'Velachery', dist: 7800 },
    { u: user2Id, m: user3Id, r: 'driver', orig: 'Velachery', dest: 'Tambaram', dist: 15200 },
    { u: user4Id, m: user1Id, r: 'driver', orig: 'Adyar', dest: 'T. Nagar', dist: 6500 },
    { u: user4Id, m: user2Id, r: 'driver', orig: 'Guindy', dest: 'Koyambedu', dist: 11000 },
  ];

  store.trips = completedTripsData.map((d, idx) => ({
    _id: `66f0000000000000000000c${idx.toString(16)}`,
    userId: d.u,
    matchedUserId: d.m,
    role: d.r,
    origin: { address: d.orig, location: { type: 'Point', coordinates: [80.22, 13.0] } },
    destination: { address: d.dest, location: { type: 'Point', coordinates: [80.23, 12.95] } },
    routeDistance: d.dist,
    departureTime: new Date(Date.now() - (idx + 1) * 86400000),
    seatCount: 2,
    status: 'COMPLETED',
    faceVerificationStatus: 'VERIFIED',
    completedAt: new Date(Date.now() - (idx + 1) * 86400000 + 1800000),
    createdAt: new Date(Date.now() - (idx + 1) * 86400000),
    updatedAt: new Date(),
  }));

  // Seed cancelled trip for Rahul (user2) to demonstrate deterministic cancellation penalty (-5 pts)
  store.trips.push({
    _id: '66f0000000000000000000cf',
    userId: user2Id,
    role: 'driver',
    origin: { address: 'Guindy', location: { type: 'Point', coordinates: [80.22, 13.0] } },
    destination: { address: 'OMR Tech Park', location: { type: 'Point', coordinates: [80.23, 12.95] } },
    routeDistance: 12400,
    departureTime: new Date(Date.now() - 3 * 86400000),
    status: 'CANCELLED',
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date(),
  });

  // Seed active trip by driver Rahul (Guindy to OMR)
  const trip1Id = '66f000000000000000000010';
  store.trips.push({
    _id: trip1Id,
    userId: user2Id,
    role: 'driver',
    origin: {
      address: 'Guindy',
      location: { type: 'Point', coordinates: [80.2206, 13.0067] },
    },
    destination: {
      address: 'OMR Tech Park',
      location: { type: 'Point', coordinates: [80.2340, 12.9400] },
    },
    route: {
      type: 'LineString',
      coordinates: [
        [80.2206, 13.0067],
        [80.2250, 12.9900],
        [80.2300, 12.9650],
        [80.2340, 12.9400],
      ],
    },
    routeDistance: 12400,
    routeDuration: 1380,
    departureTime: new Date(Date.now() + 60 * 60 * 1000),
    timeWindow: 30,
    seatCount: 3,
    budgetMin: 30,
    budgetMax: 90,
    tolls: 0,
    verifiedOnly: false,
    womenOnly: false,
    status: 'POSTED',
    faceVerificationStatus: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Seed genuine peer ratings
  store.ratings = [
    { _id: '66f0000000000000000000r1', rater: user2Id, ratedUser: user1Id, rating: 5, comment: 'Punctual & smooth driving' },
    { _id: '66f0000000000000000000r2', rater: user3Id, ratedUser: user1Id, rating: 5, comment: 'Felt very safe, courteous' },
    { _id: '66f0000000000000000000r3', rater: user4Id, ratedUser: user1Id, rating: 5, comment: 'Great commute experience' },
    { _id: '66f0000000000000000000r4', rater: user2Id, ratedUser: user1Id, rating: 4, comment: 'Good trip' },
    { _id: '66f0000000000000000000r5', rater: user3Id, ratedUser: user1Id, rating: 5, comment: 'Always on time' },

    { _id: '66f0000000000000000000r6', rater: user1Id, ratedUser: user2Id, rating: 4, comment: 'Good communication' },
    { _id: '66f0000000000000000000r7', rater: user3Id, ratedUser: user2Id, rating: 5, comment: 'Very careful rider' },
    { _id: '66f0000000000000000000r8', rater: user1Id, ratedUser: user2Id, rating: 4, comment: 'Prompt and clear' },

    { _id: '66f0000000000000000000r9', rater: user1Id, ratedUser: user3Id, rating: 5, comment: 'Ideal co-passenger' },
    { _id: '66f0000000000000000000ra', rater: user2Id, ratedUser: user3Id, rating: 5, comment: 'Very polite and respectful' },
    { _id: '66f0000000000000000000rb', rater: user1Id, ratedUser: user3Id, rating: 5, comment: 'Always ready on time' },
    { _id: '66f0000000000000000000rc', rater: user2Id, ratedUser: user3Id, rating: 5, comment: 'Excellent commute partner' },

    { _id: '66f0000000000000000000rd', rater: user1Id, ratedUser: user4Id, rating: 4, comment: 'Pleasant ride' },
    { _id: '66f0000000000000000000re', rater: user2Id, ratedUser: user4Id, rating: 4, comment: 'Smooth journey' },
  ];

  // Authoritatively compute each demo user's trust score from actual activity
  const { calculateTrustScore } = require('../services/trust-score');
  for (const u of store.users) {
    const userTrips = store.trips.filter(
      (t) => (t.userId === u._id || t.matchedUserId === u._id) && t.status === 'COMPLETED'
    );
    const userCancellations = store.trips.filter(
      (t) => t.userId === u._id && t.status === 'CANCELLED'
    );
    const userNoShows = store.trips.filter(
      (t) => t.userId === u._id && t.status === 'NO_SHOW'
    );
    const userRatings = store.ratings.filter((r) => r.ratedUser === u._id);
    const avgRating = userRatings.length > 0
      ? userRatings.reduce((acc, r) => acc + r.rating, 0) / userRatings.length
      : null;

    const activity = {
      completedTripsCount: userTrips.length,
      averageRating: avgRating,
      ratingsCount: userRatings.length,
      cancellationsCount: userCancellations.length,
      noShowsCount: userNoShows.length,
      unresolvedSafetyCount: 0,
    };

    const trustResult = calculateTrustScore(u, activity);
    u.trustScore = trustResult.score;
    u.trustScoreBreakdown = trustResult;
  }
}

// Helper to wrap object with Mongoose Document methods
function createDoc(collectionName, data) {
  const doc = { ...data };
  if (!doc._id) doc._id = generateId();

  // Attach .save() method
  doc.save = async function () {
    doc.updatedAt = new Date();
    const idx = store[collectionName].findIndex((item) => item._id.toString() === doc._id.toString());
    if (idx >= 0) {
      store[collectionName][idx] = doc;
    } else {
      store[collectionName].push(doc);
    }
    return doc;
  };

  doc.toObject = function () {
    return { ...doc };
  };

  doc.toJSON = function () {
    return { ...doc };
  };

  return doc;
}

// Chainable query builder
class QueryBuilder {
  constructor(collectionName, items) {
    this.collectionName = collectionName;
    this.items = items.map((item) => createDoc(collectionName, item));
  }

  sort(sortCriteria) {
    return this;
  }

  limit(count) {
    this.items = this.items.slice(0, count);
    return this;
  }

  skip(count) {
    this.items = this.items.slice(count);
    return this;
  }

  select(fields) {
    return this;
  }

  populate(field, selectFields) {
    if (field === 'matchedUserId' || field === 'userId') {
      this.items.forEach((item) => {
        const uId = item[field];
        if (uId) {
          const userDoc = store.users.find((u) => u._id.toString() === uId.toString());
          if (userDoc) item[field] = { ...userDoc };
        }
      });
    }
    return this;
  }

  then(resolve, reject) {
    return Promise.resolve(this.items).then(resolve, reject);
  }
}

// Match item against MongoDB-like query
function matchesQuery(item, query) {
  if (!query || Object.keys(query).length === 0) return true;

  // Handle top-level $or
  if (query.$or && Array.isArray(query.$or)) {
    const orMatches = query.$or.some((subQuery) => matchesQuery(item, subQuery));
    if (!orMatches) return false;
  }

  for (const [key, val] of Object.entries(query)) {
    if (key === '$or') continue;

    const itemVal = item[key];

    if (val && typeof val === 'object' && !(val instanceof Date)) {
      if (val.$in) {
        const strVal = itemVal?.toString();
        const inList = val.$in.map((v) => v?.toString());
        if (!inList.includes(strVal)) return false;
      }
      if (val.$ne !== undefined) {
        if (itemVal?.toString() === val.$ne?.toString()) return false;
      }
      if (val.$gte !== undefined) {
        const itemTime = new Date(itemVal).getTime();
        const gteTime = new Date(val.$gte).getTime();
        if (!isNaN(itemTime) && !isNaN(gteTime)) {
          if (itemTime < gteTime) return false;
        } else if (itemVal < val.$gte) {
          return false;
        }
      }
      if (val.$lte !== undefined) {
        const itemTime = new Date(itemVal).getTime();
        const lteTime = new Date(val.$lte).getTime();
        if (!isNaN(itemTime) && !isNaN(lteTime)) {
          if (itemTime > lteTime) return false;
        } else if (itemVal > val.$lte) {
          return false;
        }
      }
      if (val.$gt !== undefined) {
        const itemTime = new Date(itemVal).getTime();
        const gtTime = new Date(val.$gt).getTime();
        if (!isNaN(itemTime) && !isNaN(gtTime)) {
          if (itemTime <= gtTime) return false;
        } else if (itemVal <= val.$gt) {
          return false;
        }
      }
      if (val.$lt !== undefined) {
        const itemTime = new Date(itemVal).getTime();
        const ltTime = new Date(val.$lt).getTime();
        if (!isNaN(itemTime) && !isNaN(ltTime)) {
          if (itemTime >= ltTime) return false;
        } else if (itemVal >= val.$lt) {
          return false;
        }
      }
      continue;
    }

    if (itemVal === undefined) return false;

    if (val instanceof Date) {
      if (new Date(itemVal).getTime() !== val.getTime()) return false;
    } else if (itemVal?.toString() !== val?.toString()) {
      return false;
    }
  }

  return true;
}

function setupInMemoryFallback() {
  seedInitialData();

  const mongoose = require('mongoose');
  mongoose.set('bufferCommands', false);

  // Explicitly require all models so their schemas are registered with Mongoose
  require('../models/User');
  require('../models/Trip');
  require('../models/Match');
  require('../models/Rating');
  require('../models/SOSAlert');
  require('../models/Penalty');

  const models = [
    { name: 'User', coll: 'users' },
    { name: 'Trip', coll: 'trips' },
    { name: 'Match', coll: 'matches' },
    { name: 'Rating', coll: 'ratings' },
    { name: 'SOSAlert', coll: 'sosAlerts' },
    { name: 'Penalty', coll: 'penalties' },
  ];

  for (const { name, coll } of models) {
    let Model;
    try {
      Model = mongoose.model(name);
    } catch {
      continue;
    }

    // Override static methods
    Model.find = function (query = {}) {
      const filtered = store[coll].filter((item) => matchesQuery(item, query));
      return new QueryBuilder(coll, filtered);
    };

    Model.findOne = function (query = {}) {
      const filtered = store[coll].filter((item) => matchesQuery(item, query));
      const first = filtered[0] ? createDoc(coll, filtered[0]) : null;

      const promise = Promise.resolve(first);
      promise.select = () => promise;
      promise.populate = (field) => {
        if (first && (field === 'matchedUserId' || field === 'userId')) {
          const uId = first[field];
          if (uId) {
            const userDoc = store.users.find((u) => u._id.toString() === uId.toString());
            if (userDoc) first[field] = { ...userDoc };
          }
        }
        return promise;
      };
      return promise;
    };

    Model.findById = function (id) {
      return Model.findOne({ _id: id });
    };

    Model.findByIdAndUpdate = async function (id, updates, options = {}) {
      const idx = store[coll].findIndex((item) => item._id.toString() === id.toString());
      if (idx >= 0) {
        const updated = { ...store[coll][idx], ...updates, updatedAt: new Date() };
        store[coll][idx] = updated;
        return createDoc(coll, updated);
      }
      return null;
    };

    // Override instance prototype save so new Model().save() never buffers or times out
    Model.prototype.save = async function () {
      this.updatedAt = new Date();
      const obj = this.toObject ? this.toObject() : { ...this };
      if (!obj._id) {
        obj._id = generateId();
        this._id = obj._id;
      }
      const idx = store[coll].findIndex((item) => item._id.toString() === obj._id.toString());
      if (idx >= 0) {
        store[coll][idx] = { ...store[coll][idx], ...obj };
      } else {
        store[coll].push(obj);
      }
      return this;
    };

    Model.create = async function (data) {
      const doc = createDoc(coll, data);
      store[coll].push(doc);
      return doc;
    };

    Model.deleteMany = async function (query = {}) {
      if (!query || Object.keys(query).length === 0) {
        const count = store[coll].length;
        store[coll] = [];
        return { deletedCount: count };
      }
      const before = store[coll].length;
      store[coll] = store[coll].filter((item) => !matchesQuery(item, query));
      return { deletedCount: before - store[coll].length };
    };

    Model.countDocuments = async function (query = {}) {
      return store[coll].filter((item) => matchesQuery(item, query)).length;
    };

    Model.findByIdAndDelete = async function (id) {
      const idx = store[coll].findIndex((item) => item._id.toString() === id.toString());
      if (idx >= 0) {
        return store[coll].splice(idx, 1)[0];
      }
      return null;
    };
  }

  console.log(`[DB] In-Memory Database initialized with ${store.users.length} demo users and ${store.trips.length} active trips.`);
}

module.exports = { setupInMemoryFallback, store };
