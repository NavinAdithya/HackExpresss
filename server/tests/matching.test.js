/**
 * Matching Engine Tests
 *
 * Tests the PURE scoring functions with known inputs.
 * No DB, no Redis, no API calls — pure unit tests.
 */

const {
  computeTimeCompatibility,
  computeBudgetCompatibility,
  computeCapacityCompatibility,
  scoreMatch,
  applyProPriority,
} = require('../services/matching-engine');

describe('Matching Engine — Pure Scorer', () => {
  describe('computeTimeCompatibility', () => {
    test('identical times → 100% compatibility', () => {
      const time = new Date('2024-01-15T08:00:00Z');
      const score = computeTimeCompatibility(time, 30, time, 30);
      expect(score).toBe(100);
    });

    test('no overlap → 0% compatibility', () => {
      const timeA = new Date('2024-01-15T08:00:00Z');
      const timeB = new Date('2024-01-15T20:00:00Z');
      const score = computeTimeCompatibility(timeA, 30, timeB, 30);
      expect(score).toBe(0);
    });

    test('partial overlap → between 0 and 100', () => {
      const timeA = new Date('2024-01-15T08:00:00Z');
      const timeB = new Date('2024-01-15T08:45:00Z');
      const score = computeTimeCompatibility(timeA, 30, timeB, 30);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });

  describe('computeBudgetCompatibility', () => {
    test('fully overlapping budgets', () => {
      const result = computeBudgetCompatibility(
        { min: 20, max: 60 },
        { min: 30, max: 50 }
      );
      expect(result.compatible).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    test('non-overlapping budgets', () => {
      const result = computeBudgetCompatibility(
        { min: 10, max: 20 },
        { min: 50, max: 80 }
      );
      expect(result.compatible).toBe(false);
      expect(result.score).toBe(0);
    });

    test('identical budgets → max score', () => {
      const result = computeBudgetCompatibility(
        { min: 30, max: 50 },
        { min: 30, max: 50 }
      );
      expect(result.compatible).toBe(true);
      expect(result.score).toBe(100);
    });
  });

  describe('computeCapacityCompatibility', () => {
    test('enough seats → compatible', () => {
      const result = computeCapacityCompatibility(3, 1);
      expect(result.compatible).toBe(true);
      expect(result.score).toBe(100);
    });

    test('not enough seats → incompatible', () => {
      const result = computeCapacityCompatibility(1, 3);
      expect(result.compatible).toBe(false);
      expect(result.score).toBe(0);
    });

    test('exact seats → compatible', () => {
      const result = computeCapacityCompatibility(2, 2);
      expect(result.compatible).toBe(true);
    });
  });

  describe('scoreMatch', () => {
    test('perfect match → high score', () => {
      const result = scoreMatch({
        routeOverlap: 90,
        timeCompatibility: 95,
        budgetCompatibility: { compatible: true, score: 80 },
        capacityCompatibility: { compatible: true, score: 100 },
      });

      expect(result.finalScore).toBeGreaterThan(80);
      expect(result.routeScore).toBe(90);
      expect(result.timeScore).toBe(95);
      expect(result.budgetCompatible).toBe(true);
      expect(result.capacityCompatible).toBe(true);
    });

    test('incompatible budget → low budget score', () => {
      const result = scoreMatch({
        routeOverlap: 90,
        timeCompatibility: 95,
        budgetCompatibility: { compatible: false, score: 0 },
        capacityCompatibility: { compatible: true, score: 100 },
      });

      expect(result.budgetScore).toBe(0);
      expect(result.budgetCompatible).toBe(false);
    });
  });

  describe('applyProPriority', () => {
    test('PRO user gets ranking boost', () => {
      const matches = [
        { userId: 'user1', finalScore: 85 },
        { userId: 'user2', finalScore: 80 },
      ];

      const usersMap = {
        user1: { plan: 'FREE' },
        user2: { plan: 'PRO' },
      };

      const ranked = applyProPriority(matches, usersMap);

      // user2 (PRO) should get +3 boost: 80 + 3 = 83
      // user1 (FREE) stays at 85
      // user1 should still be first since 85 > 83
      expect(ranked[0].userId).toBe('user1');
      expect(ranked[0].proBoost).toBe(0);
      expect(ranked[1].proBoost).toBe(3);
    });

    test('PRO boost alone cannot override higher-scored FREE user', () => {
      const matches = [
        { userId: 'free-user', finalScore: 90 },
        { userId: 'pro-user', finalScore: 82 },
      ];

      const usersMap = {
        'free-user': { plan: 'FREE' },
        'pro-user': { plan: 'PRO' },
      };

      const ranked = applyProPriority(matches, usersMap);
      // 90 > 82+3=85, FREE user stays on top
      expect(ranked[0].userId).toBe('free-user');
    });
  });

  describe('Honest Match Quality Thresholds (Requirement 2 & 3)', () => {
    test('score < 40 is classified as Not suitable and never calls a poor match great', () => {
      const result = scoreMatch({
        routeOverlap: 0,
        pickupDistanceKm: 4.5,
        destinationDistanceKm: 4.93,
        timeCompatibility: 1,
      });

      expect(result.finalScore).toBeLessThan(40);
      expect(result.qualityTier).toBe('NOT_SUITABLE');
      expect(result.qualityLabel).toBe('Not suitable');

      const { generateFallbackExplanation } = require('../services/gemini-service');
      const explanation = generateFallbackExplanation({
        finalScore: result.finalScore,
        routeOverlap: 0,
        timeCompatibility: 1,
        detourKm: 8.34,
        destinationDistanceKm: 4.93,
      });

      expect(explanation.explanation).toContain('Not a suitable match');
      expect(explanation.explanation).not.toContain('Great match');
    });

    test('score 80-89 is classified as Strong match', () => {
      const result = scoreMatch({
        routeOverlap: 80,
        pickupDistanceKm: 1.0,
        destinationDistanceKm: 1.0,
        timeCompatibility: 75,
      });

      expect(result.finalScore).toBeGreaterThanOrEqual(80);
      expect(result.finalScore).toBeLessThan(90);
      expect(result.qualityTier).toBe('STRONG');
      expect(result.qualityLabel).toBe('Strong match');
    });
  });
});
