/**
 * Fare Calculator Tests
 *
 * Known inputs must produce hand-calculated outputs.
 * Formula: Max Fare = (Distance × Fuel Rate + Tolls) ÷ Total Occupants
 */

const { calculateFare, calculateNoShowPenalty } = require('../services/fare-calculator');

describe('Fare Calculator', () => {
  test('basic fare calculation with known inputs', () => {
    // 10 km, no tolls, 2 occupants
    // Expected: (10 × 8 + 0) ÷ 2 = 40
    // Commission: 40 × 0.10 = 4
    // Final: 40 - 4 = 36
    const result = calculateFare(10000, 0, 2);

    expect(result.distanceKm).toBe(10);
    expect(result.fuelCost).toBe(80);
    expect(result.tolls).toBe(0);
    expect(result.totalOccupants).toBe(2);
    expect(result.poolFare).toBe(40);
    expect(result.commission).toBe(4);
    expect(result.finalAmount).toBe(36);
  });

  test('fare with tolls included', () => {
    // 15 km, ₹50 tolls, 3 occupants
    // Expected: (15 × 8 + 50) ÷ 3 = (120 + 50) / 3 = 56.67
    // Commission: 56.67 × 0.10 = 5.67
    // Final: 56.67 - 5.67 = 51.00
    const result = calculateFare(15000, 50, 3);

    expect(result.distanceKm).toBe(15);
    expect(result.fuelCost).toBe(120);
    expect(result.tolls).toBe(50);
    expect(result.totalOccupants).toBe(3);
    expect(result.poolFare).toBeCloseTo(56.67, 1);
    expect(result.commission).toBeCloseTo(5.67, 1);
    expect(result.finalAmount).toBeCloseTo(51, 0);
  });

  test('fare with single occupant', () => {
    // 5 km, no tolls, 1 occupant
    // Expected: (5 × 8 + 0) ÷ 1 = 40
    const result = calculateFare(5000, 0, 1);

    expect(result.poolFare).toBe(40);
  });

  test('commission is a separate line item', () => {
    const result = calculateFare(20000, 0, 2);

    // poolFare = (20 × 8) / 2 = 80
    // commission = 80 × 0.10 = 8
    expect(result.poolFare).toBe(80);
    expect(result.commission).toBe(8);
    expect(result.finalAmount).toBe(72);
    expect(result.poolFare - result.commission).toBe(result.finalAmount);
  });
});

describe('No-Show Penalty', () => {
  test('calculates percentage-based penalty', () => {
    const result = calculateNoShowPenalty(100);

    expect(result.penaltyAmount).toBe(10); // 10% of 100
    expect(result.driverCompensation).toBe(10);
  });

  test('penalty and compensation are equal', () => {
    const result = calculateNoShowPenalty(50);

    expect(result.penaltyAmount).toBe(result.driverCompensation);
  });
});
