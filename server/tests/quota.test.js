/**
 * PO → PO — Daily Commute Quota & Status Rules Test Suite
 *
 * Verifies Master Specification:
 * - Daily ride limit must NEVER be incremented merely because the user:
 *   - clicks Share My Commute
 *   - creates a TravellerCommute
 *   - performs a search
 *   - receives no passenger match
 *   - receives no suitable passenger
 *   - has a pending/unconfirmed request
 *
 * - A commute counts toward the daily limit only when a real passenger
 *   relationship is established and the ride reaches CONFIRMED.
 *
 * STATUS RULES:
 * - CREATED                       → 0
 * - SEARCHING                     → 0
 * - NO_MATCH                      → 0
 * - EXPIRED                       → 0
 * - PENDING                       → 0
 * - CANCELLED_BEFORE_CONFIRMATION → 0
 * - CANCELLED (before start)      → 0 (Releases reserved quota)
 * - CONFIRMED                     → 1
 * - IN_PROGRESS                   → 1
 * - COMPLETED                     → 1
 *
 * Example from Spec:
 *   Traveller submits Share My Commute twice.
 *   First search → no passenger.
 *   Second search → no passenger.
 *   Result:
 *   daily successful rides = 0
 *   daily quota remaining = 2
 */

const {
  QUOTA_CONFIG,
  getCalendarDayBounds,
  calculateQuotaFromTripList,
} = require('../services/quota-service');

describe('PO → PO Daily Commute Quota Engine', () => {
  const userId = 'user_traveller_123';
  const today = new Date();

  test('Specification Rule: 2 searches with no passenger matches consume 0 quota', () => {
    // Traveller submits Share My Commute twice; first search -> no passenger, second search -> no passenger
    const trips = [
      {
        _id: 'trip_search_1',
        userId: userId,
        status: 'POSTED',
        createdAt: today,
        departureTime: today,
      },
      {
        _id: 'trip_search_2',
        userId: userId,
        status: 'SEARCHING',
        createdAt: today,
        departureTime: today,
      },
    ];

    const quota = calculateQuotaFromTripList(trips, userId, today);

    expect(quota.maxRidesPerDay).toBe(2);
    expect(quota.usedRideCount).toBe(0);
    expect(quota.remainingRideCount).toBe(2);
    expect(quota.canConfirmRide).toBe(true);
    expect(quota.metrics.searchAttempts).toBe(2);
    expect(quota.metrics.commutePublications).toBe(2);
    expect(quota.metrics.passengerMatches).toBe(0);
    expect(quota.metrics.confirmedRides).toBe(0);
    expect(quota.metrics.completedRides).toBe(0);
  });

  test('Specification Status Rules: Non-consuming statuses map to 0', () => {
    const nonConsumingStatuses = [
      'CREATED',
      'SEARCHING',
      'POSTED',
      'NO_MATCH',
      'EXPIRED',
      'PENDING',
      'CANCELLED_BEFORE_CONFIRMATION',
    ];

    const trips = nonConsumingStatuses.map((status, index) => ({
      _id: `trip_test_${index}`,
      userId: userId,
      status,
      createdAt: today,
    }));

    const quota = calculateQuotaFromTripList(trips, userId, today);

    // None of these should consume daily quota
    expect(quota.usedRideCount).toBe(0);
    expect(quota.remainingRideCount).toBe(2);
    expect(quota.canConfirmRide).toBe(true);
  });

  test('Specification Status Rules: CONFIRMED, IN_PROGRESS, COMPLETED consume 1 quota', () => {
    const confirmedTrip = [
      {
        _id: 'trip_confirmed_1',
        matchId: 'match_1',
        userId: userId,
        matchedUserId: 'user_passenger_456',
        status: 'CONFIRMED',
        createdAt: today,
      },
    ];

    const quota1 = calculateQuotaFromTripList(confirmedTrip, userId, today);
    expect(quota1.usedRideCount).toBe(1);
    expect(quota1.remainingRideCount).toBe(1);
    expect(quota1.metrics.confirmedRides).toBe(1);

    const inProgressTrip = [
      {
        _id: 'trip_in_prog_1',
        matchId: 'match_1',
        userId: userId,
        matchedUserId: 'user_passenger_456',
        status: 'IN_PROGRESS',
        startedAt: today,
        createdAt: today,
      },
    ];

    const quota2 = calculateQuotaFromTripList(inProgressTrip, userId, today);
    expect(quota2.usedRideCount).toBe(1);
    expect(quota2.remainingRideCount).toBe(1);

    const completedTrip = [
      {
        _id: 'trip_completed_1',
        matchId: 'match_1',
        userId: userId,
        matchedUserId: 'user_passenger_456',
        status: 'COMPLETED',
        startedAt: today,
        completedAt: today,
        createdAt: today,
      },
    ];

    const quota3 = calculateQuotaFromTripList(completedTrip, userId, today);
    expect(quota3.usedRideCount).toBe(1);
    expect(quota3.remainingRideCount).toBe(1);
    expect(quota3.metrics.completedRides).toBe(1);
  });

  test('Cancellation before trip starts releases reserved daily quota', () => {
    // 1 confirmed ride that was cancelled before it started
    const cancelledTrip = [
      {
        _id: 'trip_cancelled_1',
        matchId: 'match_cancelled_1',
        userId: userId,
        matchedUserId: 'user_passenger_456',
        status: 'CANCELLED',
        startedAt: null, // Did NOT start
        createdAt: today,
      },
    ];

    const quota = calculateQuotaFromTripList(cancelledTrip, userId, today);

    expect(quota.usedRideCount).toBe(0);
    expect(quota.remainingRideCount).toBe(2);
    expect(quota.canConfirmRide).toBe(true);
    expect(quota.metrics.cancelledBeforeStart).toBe(1);
  });

  test('Maximum 2 confirmed shared commutes per calendar day blocks 3rd ride', () => {
    const twoConfirmedTrips = [
      {
        _id: 'trip_1',
        matchId: 'match_1',
        userId: userId,
        matchedUserId: 'passenger_1',
        status: 'COMPLETED',
        startedAt: today,
        completedAt: today,
        createdAt: today,
      },
      {
        _id: 'trip_2',
        matchId: 'match_2',
        userId: userId,
        matchedUserId: 'passenger_2',
        status: 'CONFIRMED',
        createdAt: today,
      },
    ];

    const quota = calculateQuotaFromTripList(twoConfirmedTrips, userId, today);

    expect(quota.usedRideCount).toBe(2);
    expect(quota.remainingRideCount).toBe(0);
    expect(quota.canConfirmRide).toBe(false);
  });

  test('Trips from yesterday do not consume today quota', () => {
    const yesterday = new Date(today.getTime() - 26 * 60 * 60 * 1000);

    const pastTrips = [
      {
        _id: 'trip_yesterday_1',
        userId: userId,
        status: 'COMPLETED',
        createdAt: yesterday,
        departureTime: yesterday,
      },
      {
        _id: 'trip_yesterday_2',
        userId: userId,
        status: 'COMPLETED',
        createdAt: yesterday,
        departureTime: yesterday,
      },
    ];

    const quota = calculateQuotaFromTripList(pastTrips, userId, today);

    expect(quota.usedRideCount).toBe(0);
    expect(quota.remainingRideCount).toBe(2);
    expect(quota.canConfirmRide).toBe(true);
  });

  test('Calendar day bounds calculate next reset at midnight', () => {
    const { startOfDay, endOfDay, resetAt } = getCalendarDayBounds(today);

    expect(resetAt.getTime()).toBeGreaterThan(today.getTime());
    expect(resetAt.getHours()).toBe(0);
    expect(resetAt.getMinutes()).toBe(0);
    expect(resetAt.getSeconds()).toBe(0);
    expect(startOfDay.getHours()).toBe(0);
    expect(endOfDay.getHours()).toBe(23);
    expect(endOfDay.getMinutes()).toBe(59);
  });
});
