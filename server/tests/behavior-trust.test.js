/**
 * Behavioural Trust (5 parameters, 1–10) — pure calculation tests
 */

const {
  computeBehaviorTrust, tripRatingOverall, classifyTrust, toTrustLite, isValidScore, TRUST_PARAMS,
} = require('../services/behavior-trust');
const { applyRankingSignals, buildMatchReasons } = require('../services/matching-engine');

const rating = (r, s, re, rc, c) => ({ reliability: r, safety: s, respect: re, routeCommitment: rc, communication: c });

describe('Behavioural trust calculation', () => {
  test('zero ratings → NEW_USER, no invented score', () => {
    const t = computeBehaviorTrust([]);
    expect(t.count).toBe(0);
    expect(t.overall).toBeNull();
    expect(t.parameters).toBeNull();
    expect(t.status).toBe('NEW_USER');
    expect(t.label).toBe('New User');
  });

  test('legacy star-only ratings (no parameters) are ignored', () => {
    const t = computeBehaviorTrust([{ rating: 5 }, { rating: 4, reliability: 9 }]);
    expect(t.count).toBe(0);
    expect(t.status).toBe('NEW_USER');
  });

  test('trip rating is the mean of the five parameters', () => {
    expect(tripRatingOverall(rating(9, 10, 9, 10, 9))).toBe(9.4);
  });

  test('overall is the mean of the five parameter averages', () => {
    // 5 ratings whose per-parameter averages are exactly those values
    const ratings = [
      rating(10, 10, 9, 9, 9),
      rating(9, 10, 9, 9, 9),
      rating(9, 10, 9, 9, 10),
      rating(10, 9, 9, 9, 9),
      rating(9, 10, 9, 10, 9),
    ];
    const t = computeBehaviorTrust(ratings);
    expect(t.count).toBe(5);
    expect(t.parameters).toEqual({ reliability: 9.4, safety: 9.8, respect: 9, routeCommitment: 9.2, communication: 9.2 });
    const manual = (9.4 + 9.8 + 9.0 + 9.2 + 9.2) / 5;
    expect(t.overall).toBe(Math.round(manual * 10) / 10);
  });

  test('overall averages the UNROUNDED parameter averages (no double rounding)', () => {
    // parameter averages: rel 9.333.., saf 10, res 9.333.., rc 9.333.., com 9  → overall 9.4 (not 9.3)
    const t = computeBehaviorTrust([
      rating(9, 10, 9, 9, 9), rating(9, 10, 9, 9, 9), rating(10, 10, 10, 10, 9),
    ]);
    const raw = ((28 / 3) + 10 + (28 / 3) + (28 / 3) + 9) / 5;
    expect(t.overall).toBe(Math.round(raw * 10) / 10);
  });

  test('1–4 ratings show a score but flag limited history and never HIGH', () => {
    const t = computeBehaviorTrust([rating(10, 10, 10, 10, 10), rating(10, 10, 10, 10, 10)]);
    expect(t.overall).toBe(10);
    expect(t.limitedHistory).toBe(true);
    expect(t.level).toBe('BUILDING');
    expect(t.label).not.toBe('High Trust');
  });

  test('5+ ratings unlock levels', () => {
    const five = (v) => Array.from({ length: 5 }, () => rating(v, v, v, v, v));
    expect(computeBehaviorTrust(five(9)).label).toBe('High Trust');
    expect(computeBehaviorTrust(five(8)).label).toBe('Good Trust');
    expect(computeBehaviorTrust(five(6)).label).toBe('Fair');
    expect(computeBehaviorTrust(five(3)).label).toBe('Low Trust');
  });

  test('score validation is 1–10 integers only', () => {
    [1, 5, 10].forEach((v) => expect(isValidScore(v)).toBe(true));
    [0, 11, 5.5, NaN, -1].forEach((v) => expect(isValidScore(v)).toBe(false));
    expect(TRUST_PARAMS).toHaveLength(5);
  });

  test('classifyTrust boundaries', () => {
    expect(classifyTrust(null, 0).status).toBe('NEW_USER');
    expect(classifyTrust(9.9, 4).status).toBe('LIMITED');
    expect(classifyTrust(8.5, 5).level).toBe('HIGH');
    expect(classifyTrust(8.49, 5).level).toBe('GOOD');
  });

  test('toTrustLite exposes only a safe subset', () => {
    const lite = toTrustLite(computeBehaviorTrust([rating(9, 9, 9, 9, 9)]));
    expect(Object.keys(lite).sort()).toEqual(['count', 'label', 'level', 'limitedHistory', 'overall', 'status'].sort());
    expect(toTrustLite(null).status).toBe('NEW_USER');
  });
});

describe('Trust + community ranking signals', () => {
  const m = (id, score) => ({ userId: id, finalScore: score, adjustedScore: score, routeScore: score });

  test('new user gets exactly zero trust adjustment', () => {
    const out = applyRankingSignals([m('a', 80)], { trustByUser: { a: { count: 0, overall: null } } });
    expect(out[0].trustAdjustment).toBe(0);
    expect(out[0].adjustedScore).toBe(80);
  });

  test('high trust with enough ratings ranks above equal route/time; low trust below', () => {
    const ctx = { trustByUser: { hi: { count: 8, overall: 9.6 }, lo: { count: 8, overall: 3 }, mid: { count: 8, overall: 7 } } };
    const out = applyRankingSignals([m('lo', 80), m('mid', 80), m('hi', 80)], ctx);
    expect(out.map((x) => x.userId)).toEqual(['hi', 'mid', 'lo']);
  });

  test('trust adjustment is bounded and scaled by rating count', () => {
    const cfgMax = applyRankingSignals([m('a', 80)], { trustByUser: { a: { count: 50, overall: 10 } } })[0];
    expect(cfgMax.trustAdjustment).toBeLessThanOrEqual(3);
    const cfgMin = applyRankingSignals([m('a', 80)], { trustByUser: { a: { count: 50, overall: 1 } } })[0];
    expect(cfgMin.trustAdjustment).toBeGreaterThanOrEqual(-4);
    const thin = applyRankingSignals([m('a', 80)], { trustByUser: { a: { count: 1, overall: 10 } } })[0];
    expect(thin.trustAdjustment).toBeLessThan(cfgMax.trustAdjustment);
  });

  test('shared community adds a boost but never changes finalScore', () => {
    const out = applyRankingSignals([m('a', 70), m('b', 72)], {
      sharedByUser: { a: [{ id: 'c1', name: 'Ramapuram Commuters' }] },
    });
    expect(out[0].userId).toBe('a');
    expect(out[0].finalScore).toBe(70);
    expect(out[0].communityBoost).toBeGreaterThan(0);
  });

  test('reasons explain the recommendation', () => {
    const reasons = buildMatchReasons({
      routeScore: 94, departureDeltaMin: -3, pickupDistanceKm: 0.3, detourMin: 2,
      candidateTrip: { role: 'driver', seatCount: 2 },
      sharedCommunities: [{ id: 'c', name: 'Ramapuram Commuters' }],
      userTrust: { count: 12, overall: 9.4, limitedHistory: false },
    });
    expect(reasons).toEqual(expect.arrayContaining([
      '94% route compatibility', 'Leaves 3 min earlier', 'Pickup within 500 m', '+2 min detour',
      '2 seats available', 'Same community: Ramapuram Commuters', 'Trust 9.4/10 from 12 rated journeys',
    ]));
    const fresh = buildMatchReasons({ routeScore: 80, pickupDistanceKm: 1, detourMin: 0, candidateTrip: { role: 'passenger' }, userTrust: { count: 0 } });
    expect(fresh).toContain('New member — no ratings yet');
  });
});
