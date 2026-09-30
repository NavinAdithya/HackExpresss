/**
 * End-to-end API tests (in-memory store) for Daily Commute, Communities and Trust.
 * Covers: new user, commute CRUD + validation + ownership, auto-matching,
 * community browse/join/leave/seat discovery, request → accept consent,
 * rating eligibility + duplicate/self/bystander/pre-completion prevention,
 * trust recalculation, and authorization.
 */

process.env.VERCEL = '1'; // force the in-memory database immediately
process.env.NODE_ENV = 'test';

jest.mock('../services/route-service', () => {
  const actual = jest.requireActual('../services/route-service');
  return {
    ...actual,
    // No network: straight-line geometry with intermediate points
    calculateRoute: jest.fn(async (o, d) => {
      const coordinates = [];
      for (let i = 0; i <= 6; i++) {
        coordinates.push([o[0] + ((d[0] - o[0]) * i) / 6, o[1] + ((d[1] - o[1]) * i) / 6]);
      }
      return { geometry: { type: 'LineString', coordinates }, distance: 9000, duration: 1200 };
    }),
  };
});

const request = require('supertest');
const app = require('../server');
const { store } = require('../config/in-memory-db');

const PRIYA = '9876543210';
const RAHUL = '9876543211';
const NEWBIE = '9000000001';
const THIRD = '9000000002';

const login = async (phone, name) => {
  const res = await request(app).post('/api/auth/quick-login').send({ phone, name });
  expect(res.status).toBe(200);
  return { token: res.body.token, id: String(res.body.user._id) };
};
const authed = (u) => ({ Authorization: `Bearer ${u.token}` });

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const commuteBody = (over = {}) => ({
  label: 'College',
  origin: { address: 'Porur', coordinates: [80.1565, 13.0382] },
  destination: { address: 'SRM Ramapuram', coordinates: [80.18, 13.0327] },
  departureTime: '08:15',
  days: ALL_DAYS,
  role: 'PASSENGER',
  requiredSeats: 1,
  autoMatchEnabled: true,
  timezoneOffsetMin: 330,
  ...over,
});

let priya, rahul, newbie, third;

beforeAll(async () => {
  // Make seeded commutes run every day so the suite is independent of the weekday it runs on.
  store.dailyCommutes.forEach((c) => { c.days = [...ALL_DAYS]; });
  priya = await login(PRIYA);
  rahul = await login(RAHUL);
  newbie = await login(NEWBIE, 'Newbie Tester');
  third = await login(THIRD, 'Third Tester');
});

describe('Trust — new user vs established user', () => {
  test('new user shows NEW_USER, no invented score, identity separate from trust', async () => {
    const res = await request(app).get(`/api/trust/user/${newbie.id}`).set(authed(newbie));
    expect(res.status).toBe(200);
    expect(res.body.trust.status).toBe('NEW_USER');
    expect(res.body.trust.count).toBe(0);
    expect(res.body.trust.overall).toBeNull();
    expect(res.body.trust.parameters).toBeNull();
    expect(res.body.identity).toEqual(expect.objectContaining({ phone: true, identity: true }));
    expect(res.body.reviews).toEqual([]);
  });

  test('established user exposes exactly five parameters, overall = their mean', async () => {
    const res = await request(app).get(`/api/trust/user/${priya.id}`).set(authed(newbie));
    expect(res.status).toBe(200);
    const { parameters, overall, count, label } = res.body.trust;
    expect(Object.keys(parameters).sort()).toEqual(['communication', 'reliability', 'respect', 'routeCommitment', 'safety']);
    const mean = Object.values(parameters).reduce((a, b) => a + b, 0) / 5;
    expect(Math.abs(overall - mean)).toBeLessThan(0.1);
    expect(count).toBeGreaterThanOrEqual(5);
    expect(label).toBe('High Trust');
  });

  test('unknown user → 404', async () => {
    const r1 = await request(app).get('/api/trust/user/66f0000000000000000fffff').set(authed(newbie));
    expect(r1.status).toBe(404);
  });

  test('unauthenticated requests are rejected on every new surface', async () => {
    for (const path of ['/api/commutes', '/api/commutes/today', '/api/communities', `/api/trust/user/${priya.id}`]) {
      const r = await request(app).get(path);
      expect(r.status).toBe(401);
    }
  });
});

describe('Daily commute CRUD + validation + ownership', () => {
  let commuteId;

  test('validation rejects bad input', async () => {
    const bad = [
      commuteBody({ departureTime: '25:99' }),
      commuteBody({ days: [] }),
      commuteBody({ days: ['Funday'] }),
      commuteBody({ origin: { address: 'X', coordinates: [500, 500] } }),
      commuteBody({ role: 'ALIEN' }),
      commuteBody({ role: 'TRAVELLER', transportMode: 'BIKE', availableSeats: 3 }),
    ];
    for (const b of bad) {
      const r = await request(app).post('/api/commutes').set(authed(newbie)).send(b);
      expect(r.status).toBe(400);
    }
  });

  test('create → list → edit → delete', async () => {
    const created = await request(app).post('/api/commutes').set(authed(newbie)).send(commuteBody());
    expect(created.status).toBe(201);
    commuteId = created.body.commute._id;
    expect(created.body.commute.routeCoordinates.length).toBeGreaterThan(1);
    expect(created.body.commute.autoMatchEnabled).toBe(true);

    const list = await request(app).get('/api/commutes').set(authed(newbie));
    expect(list.body.commutes).toHaveLength(1);

    const edited = await request(app).put(`/api/commutes/${commuteId}`).set(authed(newbie))
      .send({ departureTime: '08:30', days: ['Mon', 'Tue'], autoMatchEnabled: false });
    expect(edited.status).toBe(200);
    expect(edited.body.commute.departureTime).toBe('08:30');
    expect(edited.body.commute.days).toEqual(['Mon', 'Tue']);
    expect(edited.body.commute.autoMatchEnabled).toBe(false);

    const del = await request(app).delete(`/api/commutes/${commuteId}`).set(authed(newbie));
    expect(del.status).toBe(200);
    const after = await request(app).get('/api/commutes').set(authed(newbie));
    expect(after.body.commutes).toHaveLength(0);
  });

  test("users cannot read, edit, delete or match against another user's commute", async () => {
    const created = await request(app).post('/api/commutes').set(authed(newbie)).send(commuteBody());
    const id = created.body.commute._id;

    expect((await request(app).put(`/api/commutes/${id}`).set(authed(third)).send({ departureTime: '09:00' })).status).toBe(404);
    expect((await request(app).delete(`/api/commutes/${id}`).set(authed(third))).status).toBe(404);
    expect((await request(app).get(`/api/commutes/${id}/matches`).set(authed(third))).status).toBe(404);
    expect((await request(app).post(`/api/commutes/${id}/request`).set(authed(third))
      .send({ targetKind: 'COMMUTE', targetId: 'x', targetUserId: priya.id })).status).toBe(404);

    const list = await request(app).get('/api/commutes').set(authed(newbie));
    expect(list.body.commutes.find((c) => c._id === id)).toBeTruthy();
    await request(app).delete(`/api/commutes/${id}`).set(authed(newbie));
  });

  test('a user can save at most 5 commutes', async () => {
    const ids = [];
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/api/commutes').set(authed(third)).send(commuteBody());
      expect(r.status).toBe(201);
      ids.push(r.body.commute._id);
    }
    const sixth = await request(app).post('/api/commutes').set(authed(third)).send(commuteBody());
    expect(sixth.status).toBe(400);
    for (const id of ids) await request(app).delete(`/api/commutes/${id}`).set(authed(third));
  });
});

describe('Auto-matching, communities and seat discovery', () => {
  let commuteId;
  let ramapuramId;

  beforeAll(async () => {
    const created = await request(app).post('/api/commutes').set(authed(newbie)).send(commuteBody());
    commuteId = created.body.commute._id;
    const list = await request(app).get('/api/communities').set(authed(newbie));
    ramapuramId = list.body.communities.COLLEGE.find((c) => c.name === 'Ramapuram Commuters')._id;
  });

  test('today endpoint returns route-aware matches with reasons and trust', async () => {
    const res = await request(app).get('/api/commutes/today').set(authed(newbie));
    expect(res.status).toBe(200);
    expect(res.body.commutes).toHaveLength(1);
    const { matches } = res.body.commutes[0];
    expect(matches.length).toBeGreaterThan(0);

    const priyaMatch = matches.find((m) => m.userId === priya.id);
    expect(priyaMatch).toBeTruthy();
    expect(priyaMatch.routeCompatibility).toBeGreaterThanOrEqual(80);
    expect(priyaMatch.seatsAvailable).toBe(2);
    expect(priyaMatch.trust.label).toBe('High Trust');
    expect(priyaMatch.reasons.length).toBeGreaterThan(3);
    expect(priyaMatch.requestState).toBe('NONE');
    expect(priyaMatch.sharedCommunities).toEqual([]);
    expect(matches.find((m) => m.userId === newbie.id)).toBeUndefined();
  });

  test('auto-match OFF → today lists the commute but runs no matching', async () => {
    await request(app).put(`/api/commutes/${commuteId}`).set(authed(newbie)).send({ autoMatchEnabled: false });
    const res = await request(app).get('/api/commutes/today').set(authed(newbie));
    expect(res.body.commutes[0].autoMatch).toBe(false);
    expect(res.body.commutes[0].matches).toEqual([]);
    const manual = await request(app).get(`/api/commutes/${commuteId}/matches`).set(authed(newbie));
    expect(manual.body.matches.length).toBeGreaterThan(0);
    await request(app).put(`/api/commutes/${commuteId}`).set(authed(newbie)).send({ autoMatchEnabled: true });
  });

  test('women-only safety gate is never bypassed by trust/community ranking', async () => {
    const ananya = await login('9876543212');
    const res = await request(app).get('/api/commutes/today').set(authed(ananya));
    const ids = res.body.commutes.flatMap((c) => c.matches.map((m) => m.userId));
    expect(ids).not.toContain(rahul.id); // Rahul is male
    expect(ids).toContain(priya.id);     // Priya is female
  });

  test('communities: grouped landing, non-member restriction, join/leave', async () => {
    const list = await request(app).get('/api/communities').set(authed(newbie));
    expect(list.status).toBe(200);
    expect(Object.keys(list.body.communities).sort()).toEqual(['COLLEGE', 'OFFICE', 'ORGANIZATION', 'OTHER', 'ROUTE']);
    expect(list.body.mine).toEqual([]);

    const before = await request(app).get(`/api/communities/${ramapuramId}`).set(authed(newbie));
    expect(before.body.restricted).toBe(true);
    expect(before.body.seats).toEqual([]);
    expect(before.body.stats.availableSeats).toBeGreaterThan(0);

    const join = await request(app).post(`/api/communities/${ramapuramId}/join`).set(authed(newbie));
    expect(join.status).toBe(200);
    const joinAgain = await request(app).post(`/api/communities/${ramapuramId}/join`).set(authed(newbie));
    expect(joinAgain.body.community.memberCount).toBe(join.body.community.memberCount);

    const after = await request(app).get(`/api/communities/${ramapuramId}`).set(authed(newbie));
    expect(after.body.restricted).toBe(false);
    expect(after.body.stats.members).toBe(join.body.community.memberCount);
    const seatUsers = after.body.seats.map((s) => s.userId);
    expect(seatUsers).toEqual(expect.arrayContaining([priya.id, rahul.id]));
    expect(after.body.seats.every((s) => s.seatsAvailable > 0)).toBe(true);
    expect(after.body.popularRoutes.length).toBeGreaterThan(0);
    expect(after.body.compatible.length).toBeGreaterThan(0);
    // compatible commuters are always community members
    expect(after.body.compatible.every((m) => [priya.id, rahul.id, (store.users.find((u) => u.phone === '9876543212') || {})._id].includes(m.userId))).toBe(true);
  });

  test('shared community feeds the matcher (boost + reason)', async () => {
    await request(app).post(`/api/communities/${ramapuramId}/join`).set(authed(newbie));
    const res = await request(app).get('/api/commutes/today').set(authed(newbie));
    const priyaMatch = res.body.commutes[0].matches.find((m) => m.userId === priya.id);
    expect(priyaMatch.sharedCommunities.map((c) => c.name)).toContain('Ramapuram Commuters');
    expect(priyaMatch.reasons.join(' ')).toMatch(/Same community/);
  });

  test('leaving a community removes access and the shared-community signal', async () => {
    const leave = await request(app).delete(`/api/communities/${ramapuramId}/leave`).set(authed(newbie));
    expect(leave.status).toBe(200);
    expect(leave.body.community.isMember).toBe(false);
    const detail = await request(app).get(`/api/communities/${ramapuramId}`).set(authed(newbie));
    expect(detail.body.restricted).toBe(true);
    const today = await request(app).get('/api/commutes/today').set(authed(newbie));
    const priyaMatch = today.body.commutes[0].matches.find((m) => m.userId === priya.id);
    expect(priyaMatch.sharedCommunities).toEqual([]);
  });

  test('create community validates and prevents duplicates', async () => {
    const bad = await request(app).post('/api/communities').set(authed(newbie)).send({ name: 'ab', category: 'COLLEGE' });
    expect(bad.status).toBe(400);
    const badCat = await request(app).post('/api/communities').set(authed(newbie)).send({ name: 'Valid Name', category: 'NOPE' });
    expect(badCat.status).toBe(400);
    const ok = await request(app).post('/api/communities').set(authed(newbie)).send({ name: 'Test Route A → B', category: 'ROUTE' });
    expect(ok.status).toBe(201);
    expect(ok.body.community.memberCount).toBe(1);
    expect(ok.body.community.isMember).toBe(true);
    const dup = await request(app).post('/api/communities').set(authed(third)).send({ name: 'Test Route A → B', category: 'ROUTE' });
    expect(dup.status).toBe(409);
  });
});

describe('Request → consent → journey → rating → trust update', () => {
  let commuteId;
  let requestedMatchId;
  let newbieTripId;
  let priyaTripId;

  beforeAll(async () => {
    const list = await request(app).get('/api/commutes').set(authed(newbie));
    for (const c of list.body.commutes) await request(app).delete(`/api/commutes/${c._id}`).set(authed(newbie));
    const created = await request(app).post('/api/commutes').set(authed(newbie)).send(commuteBody());
    commuteId = created.body.commute._id;
  });

  test('requesting a journey never books it; requester cannot self-confirm', async () => {
    const matches = await request(app).get(`/api/commutes/${commuteId}/matches`).set(authed(newbie));
    const target = matches.body.matches.find((m) => m.userId === priya.id);
    expect(target).toBeTruthy();
    const payload = { targetKind: target.targetKind, targetId: target.targetId, targetUserId: target.userId, asRole: 'PASSENGER' };

    const reqRes = await request(app).post(`/api/commutes/${commuteId}/request`).set(authed(newbie)).send(payload);
    expect(reqRes.status).toBe(201);
    expect(reqRes.body.match.status).toBe('PENDING');
    requestedMatchId = String(reqRes.body.match._id);

    const again = await request(app).post(`/api/commutes/${commuteId}/request`).set(authed(newbie)).send(payload);
    expect(again.body.alreadyRequested).toBe(true);

    const self = await request(app).put(`/api/matches/${requestedMatchId}/accept`).set(authed(newbie));
    expect(self.status).toBe(403);
    expect(self.body.error).toBe('AWAITING_OTHER_COMMUTER');

    expect((await request(app).put(`/api/matches/${requestedMatchId}/accept`).set(authed(third))).status).toBe(403);
    expect((await request(app).put(`/api/matches/${requestedMatchId}/decline`).set(authed(third))).status).toBe(403);

    const refreshed = await request(app).get(`/api/commutes/${commuteId}/matches`).set(authed(newbie));
    expect(refreshed.body.matches.find((m) => m.userId === priya.id).requestState).toBe('REQUESTED');
    const incoming = await request(app).get('/api/commutes/requests').set(authed(priya));
    const item = incoming.body.requests.find((r) => r.matchId === requestedMatchId);
    expect(item.direction).toBe('INCOMING');
    expect(item.user.name).toBe('Newbie Tester');
  });

  test('cannot request yourself or a non-existent target', async () => {
    const self = await request(app).post(`/api/commutes/${commuteId}/request`).set(authed(newbie))
      .send({ targetKind: 'COMMUTE', targetId: 'x', targetUserId: newbie.id });
    expect(self.status).toBe(400);
    const ghost = await request(app).post(`/api/commutes/${commuteId}/request`).set(authed(newbie))
      .send({ targetKind: 'COMMUTE', targetId: '66f0000000000000000fffff', targetUserId: priya.id });
    expect(ghost.status).toBe(404);
  });

  test('ratings are refused before the journey is completed', async () => {
    const mine = store.trips.find((x) => String(x.userId) === newbie.id && x.role === 'passenger');
    newbieTripId = String(mine._id);

    const elig = await request(app).get(`/api/ratings/eligibility/${newbieTripId}`).set(authed(newbie));
    expect(elig.body.eligible).toBe(false);
    expect(elig.body.code).toBe('TRIP_NOT_COMPLETED');

    const post = await request(app).post('/api/ratings').set(authed(newbie))
      .send({ tripId: newbieTripId, reliability: 9, safety: 9, respect: 9, routeCommitment: 9, communication: 9 });
    expect(post.status).toBe(400);
    expect(post.body.code).toBe('TRIP_NOT_COMPLETED');
  });

  test('recipient accepts → both trips confirmed', async () => {
    const accept = await request(app).put(`/api/matches/${requestedMatchId}/accept`).set(authed(priya));
    expect(accept.status).toBe(200);
    expect(accept.body.status).toBe('CONFIRMED');
    const mine = store.trips.find((x) => String(x.userId) === newbie.id && x.role === 'passenger');
    priyaTripId = String(mine.matchedTripId);
    expect(String(mine.matchedUserId)).toBe(priya.id);
  });

  test('a journey cannot be completed without starting it', async () => {
    const r = await request(app).put(`/api/trips/${newbieTripId}/status`).set(authed(newbie)).send({ status: 'COMPLETED' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('TRIP_NOT_IN_PROGRESS');
  });

  test('start → complete → both participants eligible; bystanders never are', async () => {
    expect((await request(app).put(`/api/trips/${newbieTripId}/status`).set(authed(newbie)).send({ status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await request(app).put(`/api/trips/${newbieTripId}/status`).set(authed(newbie)).send({ status: 'COMPLETED' })).status).toBe(200);

    const e1 = await request(app).get(`/api/ratings/eligibility/${newbieTripId}`).set(authed(newbie));
    expect(e1.body.eligible).toBe(true);
    expect(e1.body.ratedUser._id).toBe(priya.id);
    const e2 = await request(app).get(`/api/ratings/eligibility/${priyaTripId}`).set(authed(priya));
    expect(e2.body.eligible).toBe(true);
    expect(e2.body.ratedUser._id).toBe(newbie.id);

    const e3 = await request(app).get(`/api/ratings/eligibility/${newbieTripId}`).set(authed(third));
    expect(e3.body.eligible).toBe(false);
    expect(e3.body.code).toBe('NOT_A_PARTICIPANT');
    const bystander = await request(app).post('/api/ratings').set(authed(third))
      .send({ tripId: newbieTripId, reliability: 1, safety: 1, respect: 1, routeCommitment: 1, communication: 1 });
    expect(bystander.status).toBe(403);
  });

  test('invalid parameter values are rejected', async () => {
    const base = { tripId: newbieTripId, reliability: 9, safety: 9, respect: 9, routeCommitment: 9, communication: 9 };
    for (const bad of [{ reliability: 0 }, { safety: 11 }, { respect: 5.5 }, { routeCommitment: 'x' }, { communication: undefined }]) {
      const r = await request(app).post('/api/ratings').set(authed(newbie)).send({ ...base, ...bad });
      expect(r.status).toBe(400);
      expect(r.body.code).toBe('INVALID_SCORES');
    }
    const legacy = await request(app).post('/api/ratings').set(authed(newbie)).send({ tripId: newbieTripId, rating: 5 });
    expect(legacy.status).toBe(400);
  });

  test("rating updates the rated user's five parameters and overall", async () => {
    const beforeRes = await request(app).get(`/api/trust/user/${priya.id}`).set(authed(newbie));
    const before = beforeRes.body.trust;

    const scores = { reliability: 10, safety: 10, respect: 9, routeCommitment: 10, communication: 9 };
    const r = await request(app).post('/api/ratings').set(authed(newbie))
      .send({ tripId: newbieTripId, ...scores, comment: 'Always on time, felt very safe.' });
    expect(r.status).toBe(201);
    expect(r.body.tripRating).toBe(9.6);
    expect(r.body.ratedUser._id).toBe(priya.id);

    const after = r.body.trust;
    expect(after.count).toBe(before.count + 1);
    const mine = store.ratings.filter((x) => String(x.ratedUser) === priya.id && x.reliability);
    const avg = (k) => mine.reduce((a, x) => a + x[k], 0) / mine.length;
    const expectedOverall = Math.round(((avg('reliability') + avg('safety') + avg('respect') + avg('routeCommitment') + avg('communication')) / 5) * 10) / 10;
    expect(after.overall).toBe(expectedOverall);
    expect(after.parameters.reliability).toBe(Math.round(avg('reliability') * 10) / 10);

    const profile = await request(app).get(`/api/trust/user/${priya.id}`).set(authed(third));
    expect(profile.body.trust.overall).toBe(expectedOverall);
    expect(profile.body.reviews.some((x) => x.comment.includes('Always on time'))).toBe(true);
  });

  test('duplicate rating for the same journey is blocked — via either trip document', async () => {
    const scores = { reliability: 1, safety: 1, respect: 1, routeCommitment: 1, communication: 1 };
    const again = await request(app).post('/api/ratings').set(authed(newbie)).send({ tripId: newbieTripId, ...scores });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ALREADY_RATED');
    const viaPartner = await request(app).post('/api/ratings').set(authed(newbie)).send({ tripId: priyaTripId, ...scores });
    expect(viaPartner.status).toBe(409);
    const e = await request(app).get(`/api/ratings/eligibility/${newbieTripId}`).set(authed(newbie));
    expect(e.body.eligible).toBe(false);
    expect(e.body.code).toBe('ALREADY_RATED');
  });

  test('the other participant can rate back; new user moves from NEW_USER to limited history', async () => {
    const pre = await request(app).get(`/api/trust/user/${newbie.id}`).set(authed(priya));
    expect(pre.body.trust.status).toBe('NEW_USER');

    const r = await request(app).post('/api/ratings').set(authed(priya))
      .send({ tripId: priyaTripId, reliability: 8, safety: 9, respect: 10, routeCommitment: 8, communication: 9 });
    expect(r.status).toBe(201);

    const post = await request(app).get(`/api/trust/user/${newbie.id}`).set(authed(priya));
    expect(post.body.trust.count).toBe(1);
    expect(post.body.trust.status).toBe('LIMITED');
    expect(post.body.trust.limitedHistory).toBe(true);
    expect(post.body.trust.overall).toBe(8.8);
    expect(post.body.trust.label).not.toBe('High Trust');
    expect(post.body.trust.completedJourneys).toBeGreaterThanOrEqual(1);
  });

  test('a rater can never rate themselves (participant guard)', async () => {
    const trip = store.trips.find((t) => String(t._id) === newbieTripId);
    const savedMatched = trip.matchedUserId;
    const savedMatch = trip.matchId;
    trip.matchedUserId = newbie.id;
    trip.matchId = 'self-check-journey';
    const r = await request(app).post('/api/ratings').set(authed(newbie))
      .send({ tripId: newbieTripId, reliability: 10, safety: 10, respect: 10, routeCommitment: 10, communication: 10 });
    expect([400, 409]).toContain(r.status);
    expect(['SELF_RATING', 'ALREADY_RATED']).toContain(r.body.code);
    trip.matchedUserId = savedMatched;
    trip.matchId = savedMatch;
  });

  test('match cards expose trust in the 1–10 shape for future recommendations', async () => {
    const mine = await request(app).get('/api/commutes').set(authed(rahul));
    const res = await request(app).get(`/api/commutes/${mine.body.commutes[0]._id}/matches`).set(authed(rahul));
    expect(res.status).toBe(200);
    res.body.matches.forEach((m) => {
      expect(m.trust).toBeDefined();
      if (m.trust.overall !== null) {
        expect(m.trust.overall).toBeGreaterThanOrEqual(1);
        expect(m.trust.overall).toBeLessThanOrEqual(10);
      }
    });
  });
});
