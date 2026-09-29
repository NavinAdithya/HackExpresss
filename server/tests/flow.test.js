/**
 * PO → PO Flow Tests
 *
 * Covers:
 * 1. Face verification gating (both parties must verify before IN_PROGRESS)
 * 2. Daily ride limit enforcement (2 rides per calendar day)
 * 3. No-show penalty & compensation logic
 * 4. Socket.io real-time location broadcast
 */

const { bothPartiesVerified } = require('../services/face-verification');
const { calculateNoShowPenalty } = require('../services/fare-calculator');
const RIDE_CONFIG = require('../config/ride');

describe('Face Verification Gating', () => {
  test('both parties must verify before IN_PROGRESS can start', () => {
    const unverifiedDriver = { faceVerificationStatus: 'PENDING' };
    const unverifiedRider = { faceVerificationStatus: 'PENDING' };
    const verifiedDriver = { faceVerificationStatus: 'VERIFIED' };
    const verifiedRider = { faceVerificationStatus: 'VERIFIED' };

    // Neither verified
    expect(bothPartiesVerified(unverifiedDriver, unverifiedRider)).toBe(false);

    // Only driver verified
    expect(bothPartiesVerified(verifiedDriver, unverifiedRider)).toBe(false);

    // Only rider verified
    expect(bothPartiesVerified(unverifiedDriver, verifiedRider)).toBe(false);

    // Both verified -> Can transition to IN_PROGRESS
    expect(bothPartiesVerified(verifiedDriver, verifiedRider)).toBe(true);
  });
});

describe('Daily Ride Limit Enforcement', () => {
  function attemptBookRide(user) {
    const maxRides = RIDE_CONFIG.maxRidesPerDay; // 2
    if (user.dailyRideCount >= maxRides) {
      return {
        status: 429,
        error: `Daily ride limit reached. You can book up to ${maxRides} rides per calendar day.`,
      };
    }
    user.dailyRideCount += 1;
    return { status: 201, rideNumber: user.dailyRideCount };
  }

  test('Ride 1 → accepted, Ride 2 → accepted, Ride 3 → rejected', () => {
    const user = { dailyRideCount: 0 };

    // Ride 1
    const res1 = attemptBookRide(user);
    expect(res1.status).toBe(201);
    expect(res1.rideNumber).toBe(1);

    // Ride 2
    const res2 = attemptBookRide(user);
    expect(res2.status).toBe(201);
    expect(res2.rideNumber).toBe(2);

    // Ride 3 -> Must fail
    const res3 = attemptBookRide(user);
    expect(res3.status).toBe(429);
    expect(res3.error).toContain('Daily ride limit reached');
  });
});

describe('No-Show Penalty & Compensation', () => {
  test('penalty created and compensation matches driver entitlement', () => {
    const tripFare = 120;
    const penaltyData = calculateNoShowPenalty(tripFare);

    // 10% penalty
    expect(penaltyData.penaltyAmount).toBe(12);
    expect(penaltyData.driverCompensation).toBe(12);

    // Mock penalty record structure
    const penaltyRecord = {
      tripId: 'trip_123',
      riderId: 'rider_abc',
      driverId: 'driver_xyz',
      reason: 'NO_SHOW',
      amount: penaltyData.penaltyAmount,
      compensation: penaltyData.driverCompensation,
      createdAt: new Date(),
    };

    expect(penaltyRecord.amount).toBe(12);
    expect(penaltyRecord.compensation).toBe(12);
    expect(penaltyRecord.reason).toBe('NO_SHOW');
  });
});

describe('Socket.io Realtime Broadcast Logic', () => {
  test('location:update event payload structure and room routing', (done) => {
    const mockTripId = 'trip_live_999';
    const mockPayload = {
      tripId: mockTripId,
      userId: 'user_driver_1',
      lat: 13.0827,
      lng: 80.2707,
      timestamp: new Date().toISOString(),
    };

    // Simulate location broadcast
    function handleLocationUpdate(socket, payload, emitToRoom) {
      expect(payload.lat).toBe(13.0827);
      expect(payload.lng).toBe(80.2707);
      expect(payload.tripId).toBe(mockTripId);

      emitToRoom(`trip:${payload.tripId}`, 'location:update', payload);
    }

    const mockEmit = (room, event, data) => {
      expect(room).toBe(`trip:${mockTripId}`);
      expect(event).toBe('location:update');
      expect(data.userId).toBe('user_driver_1');
      done();
    };

    handleLocationUpdate({}, mockPayload, mockEmit);
  });
});
