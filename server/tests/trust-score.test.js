/**
 * Deterministic Trust Score System — Unit Tests
 *
 * SPECIFICATION COMPLIANCE:
 * 1. Must be deterministically calculated from actual activity.
 * 2. Range must be 0–100.
 * 3. Factors: identity verification, traveller approval, completed trips, ratings, cancellations, no-shows, safety reports.
 * 4. STRICT PROHIBITIONS:
 *    - NO gender
 *    - NO religion
 *    - NO caste
 *    - NO income
 *    - NO arbitrary AI judgment
 *    - NO face similarity confidence as a trust metric
 *    - NO match compatibility score
 * 5. Returns a clear "Why this score?" breakdown.
 * 6. Never returns fabricated hardcoded 85%.
 */

const { calculateTrustScore, TRUST_CONFIG } = require('../services/trust-score');

describe('PO → PO Deterministic Trust Score Engine', () => {
  test('New verified member with zero activity receives clean baseline trust score (55)', () => {
    const user = {
      accountVerified: true,
      driverStatus: 'NOT_REQUESTED',
    };
    const activity = {
      completedTripsCount: 0,
      averageRating: null,
      ratingsCount: 0,
      cancellationsCount: 0,
      noShowsCount: 0,
      unresolvedSafetyCount: 0,
    };

    const result = calculateTrustScore(user, activity);

    // 25 (identity) + 0 (traveller) + 0 (trips) + 15 (neutral rating) + 15 (0 cancellations) - 0 (penalties) = 55
    expect(result.score).toBe(55);
    expect(result.tier).toBe('BUILDING');
    expect(result.breakdown.identityVerification.points).toBe(25);
    expect(result.breakdown.travellerStatus.points).toBe(0);
    expect(result.breakdown.completedTrips.points).toBe(0);
    expect(result.breakdown.ratings.points).toBe(15);
    expect(result.breakdown.cancellationReliability.points).toBe(15);
    expect(result.breakdown.conductPenalties.points).toBe(0);
  });

  test('New approved traveller with zero commutes receives approved traveller bonus (70)', () => {
    const user = {
      accountVerified: true,
      driverStatus: 'APPROVED',
    };
    const activity = {
      completedTripsCount: 0,
      averageRating: null,
      ratingsCount: 0,
      cancellationsCount: 0,
    };

    const result = calculateTrustScore(user, activity);

    // 25 (identity) + 15 (traveller) + 0 (trips) + 15 (neutral rating) + 15 (0 cancellations) = 70
    expect(result.score).toBe(70);
    expect(result.tier).toBe('ESTABLISHED');
    expect(result.breakdown.travellerStatus.points).toBe(15);
  });

  test('Experienced active member with 10+ completed trips and 5.0 ratings reaches maximum 100', () => {
    const user = {
      accountVerified: true,
      driverStatus: 'APPROVED',
    };
    const activity = {
      completedTripsCount: 12, // capped at 20 pts
      averageRating: 5.0,
      ratingsCount: 10,
      cancellationsCount: 0,
      noShowsCount: 0,
      unresolvedSafetyCount: 0,
    };

    const result = calculateTrustScore(user, activity);

    // 25 + 15 + 20 + 25 + 15 = 100
    expect(result.score).toBe(100);
    expect(result.tier).toBe('EXCELLENT');
    expect(result.breakdown.completedTrips.points).toBe(20);
    expect(result.breakdown.ratings.points).toBe(25);
  });

  test('Cancellation penalty deterministically reduces trust score by -5 per cancellation', () => {
    const user = { accountVerified: true, driverStatus: 'APPROVED' };
    const cleanActivity = { completedTripsCount: 5, averageRating: 4.8, ratingsCount: 5, cancellationsCount: 0 };
    const cancelledActivity = { ...cleanActivity, cancellationsCount: 2 };

    const cleanResult = calculateTrustScore(user, cleanActivity);
    const cancelledResult = calculateTrustScore(user, cancelledActivity);

    // Clean has 15 pts cancellation reliability; 2 cancellations deduct 10 pts (5 pts left)
    expect(cleanResult.breakdown.cancellationReliability.points).toBe(15);
    expect(cancelledResult.breakdown.cancellationReliability.points).toBe(5);
    expect(cleanResult.score - cancelledResult.score).toBe(10);
  });

  test('No-show incident applies strict -15 penalty', () => {
    const user = { accountVerified: true, driverStatus: 'APPROVED' };
    const normalActivity = { completedTripsCount: 4, averageRating: 4.5, ratingsCount: 4, noShowsCount: 0 };
    const noShowActivity = { ...normalActivity, noShowsCount: 1 };

    const normal = calculateTrustScore(user, normalActivity);
    const withNoShow = calculateTrustScore(user, noShowActivity);

    expect(normal.score - withNoShow.score).toBe(15);
    expect(withNoShow.breakdown.conductPenalties.points).toBe(-15);
  });

  test('Unresolved safety event applies strict -25 penalty', () => {
    const user = { accountVerified: true, driverStatus: 'APPROVED' };
    const cleanActivity = { completedTripsCount: 5, averageRating: 4.5, ratingsCount: 5, unresolvedSafetyCount: 0 };
    const flaggedActivity = { ...cleanActivity, unresolvedSafetyCount: 1 };

    const clean = calculateTrustScore(user, cleanActivity);
    const flagged = calculateTrustScore(user, flaggedActivity);

    expect(clean.score - flagged.score).toBe(25);
    expect(flagged.breakdown.conductPenalties.points).toBe(-25);
  });

  test('Score is strictly clamped between 0 and 100', () => {
    const unverifiedUserWithHeavyPenalties = { accountVerified: false, driverStatus: 'NOT_REQUESTED' };
    const heavyPenalties = {
      completedTripsCount: 0,
      averageRating: 1.0,
      ratingsCount: 5,
      cancellationsCount: 5,
      noShowsCount: 3, // -45
      unresolvedSafetyCount: 2, // -50
    };

    const result = calculateTrustScore(unverifiedUserWithHeavyPenalties, heavyPenalties);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBe(0);
  });

  test('Trust Score is strictly immune to prohibited variables (gender, income, caste, religion, face confidence, match compatibility)', () => {
    const baseUser = { accountVerified: true, driverStatus: 'APPROVED' };
    const activity = { completedTripsCount: 3, averageRating: 4.6, ratingsCount: 3 };

    const maleUser = { ...baseUser, gender: 'male', income: 150000, religion: 'Hindu', caste: 'General' };
    const femaleUser = { ...baseUser, gender: 'female', income: 45000, religion: 'Christian', caste: 'OBC' };

    const score1 = calculateTrustScore(maleUser, activity);
    const score2 = calculateTrustScore(femaleUser, activity);

    // Gender, income, caste, religion MUST NOT influence trust score
    expect(score1.score).toBe(score2.score);
    expect(score1.breakdown).toEqual(score2.breakdown);

    // Passing arbitrary AI or face confidence or match score MUST NOT alter the output
    const pollutedActivity = {
      ...activity,
      faceConfidence: 0.99,
      aiTrustJudgment: 99,
      matchCompatibilityScore: 95,
    };
    const scoreWithPollution = calculateTrustScore(baseUser, pollutedActivity);
    expect(scoreWithPollution.score).toBe(score1.score);
  });

  test('Calculation is 100% deterministic (re-executing 100 times produces identical output)', () => {
    const user = { accountVerified: true, driverStatus: 'APPROVED' };
    const activity = { completedTripsCount: 7, averageRating: 4.8, ratingsCount: 6, cancellationsCount: 1 };

    const initial = calculateTrustScore(user, activity);
    for (let i = 0; i < 100; i++) {
      const current = calculateTrustScore(user, activity);
      expect(current.score).toBe(initial.score);
      expect(current.tier).toBe(initial.tier);
    }
  });

  test('Provides a complete, transparent "Why this score?" factor list', () => {
    const user = { accountVerified: true, driverStatus: 'APPROVED' };
    const activity = { completedTripsCount: 5, averageRating: 4.8, ratingsCount: 5 };

    const result = calculateTrustScore(user, activity);

    expect(Array.isArray(result.factors)).toBe(true);
    expect(result.factors).toHaveLength(6);
    expect(result.factors.map((f) => f.id)).toEqual([
      'identity_verification',
      'traveller_status',
      'completed_trips',
      'ratings',
      'cancellation_reliability',
      'conduct_penalties',
    ]);

    for (const factor of result.factors) {
      expect(typeof factor.name).toBe('string');
      expect(typeof factor.points).toBe('number');
      expect(typeof factor.status).toBe('string');
      expect(typeof factor.description).toBe('string');
    }
  });
});
