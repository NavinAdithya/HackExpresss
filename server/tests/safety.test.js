/**
 * Safety Gate Tests
 *
 * Mandatory: verifiedOnly=true + unverified counterparty = NO MATCH
 */

const { applySafetyFilter } = require('../services/trust-safety');

describe('Safety Hard Filter', () => {
  test('verifiedOnly=true + unverified counterparty → REMOVED', () => {
    const trip = { verifiedOnly: true, womenOnly: false, userId: 'tripUser' };
    const tripUser = { verified: true, gender: 'female' };

    const candidates = [
      {
        trip: { verifiedOnly: false, womenOnly: false, userId: 'c1' },
        user: { _id: 'c1', verified: false, gender: 'male' }, // NOT verified
      },
      {
        trip: { verifiedOnly: false, womenOnly: false, userId: 'c2' },
        user: { _id: 'c2', verified: true, gender: 'male' }, // verified
      },
    ];

    const result = applySafetyFilter(trip, tripUser, candidates);

    expect(result).toHaveLength(1);
    expect(result[0].user._id).toBe('c2');
  });

  test('womenOnly=true + male counterparty → REMOVED', () => {
    const trip = { verifiedOnly: false, womenOnly: true, userId: 'tripUser' };
    const tripUser = { verified: true, gender: 'female' };

    const candidates = [
      {
        trip: { verifiedOnly: false, womenOnly: false, userId: 'c1' },
        user: { _id: 'c1', verified: true, gender: 'male' }, // male
      },
      {
        trip: { verifiedOnly: false, womenOnly: false, userId: 'c2' },
        user: { _id: 'c2', verified: true, gender: 'female' }, // female
      },
    ];

    const result = applySafetyFilter(trip, tripUser, candidates);

    expect(result).toHaveLength(1);
    expect(result[0].user._id).toBe('c2');
  });

  test('candidate requires verifiedOnly but trip user is unverified → REMOVED', () => {
    const trip = { verifiedOnly: false, womenOnly: false, userId: 'tripUser' };
    const tripUser = { verified: false, gender: 'male' }; // NOT verified

    const candidates = [
      {
        trip: { verifiedOnly: true, womenOnly: false, userId: 'c1' }, // requires verified
        user: { _id: 'c1', verified: true, gender: 'male' },
      },
    ];

    const result = applySafetyFilter(trip, tripUser, candidates);

    expect(result).toHaveLength(0);
  });

  test('all safety filters pass → all candidates returned', () => {
    const trip = { verifiedOnly: false, womenOnly: false, userId: 'tripUser' };
    const tripUser = { verified: true, gender: 'female' };

    const candidates = [
      {
        trip: { verifiedOnly: false, womenOnly: false, userId: 'c1' },
        user: { _id: 'c1', verified: true, gender: 'male' },
      },
      {
        trip: { verifiedOnly: false, womenOnly: false, userId: 'c2' },
        user: { _id: 'c2', verified: false, gender: 'female' },
      },
    ];

    const result = applySafetyFilter(trip, tripUser, candidates);
    expect(result).toHaveLength(2);
  });
});
