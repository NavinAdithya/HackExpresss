/**
 * Fare Calculator — transparent pricing.
 *
 * Formula:
 *   Max Fare = (Distance × Fuel Rate + Tolls) ÷ Total Occupants
 *
 * Distance comes from OSRM (real route distance).
 * Commission is a separate line item.
 */

const RIDE_CONFIG = require('../config/ride');

/**
 * Calculate fare breakdown.
 * PURE FUNCTION — no side effects.
 *
 * @param {number} distanceMeters - Route distance in meters (from OSRM)
 * @param {number} tolls - Toll amount (₹), default 0
 * @param {number} totalOccupants - Total people in vehicle (driver + passengers)
 * @returns {Object} Complete fare breakdown
 */
function calculateFare(distanceMeters, tolls = 0, totalOccupants = 2) {
  if (totalOccupants < 1) totalOccupants = 1;
  if (distanceMeters < 0) distanceMeters = 0;

  const distanceKm = distanceMeters / 1000;
  const fuelCost = distanceKm * RIDE_CONFIG.fuelRatePerKm;
  const totalCost = fuelCost + tolls;
  const perPersonFare = totalCost / totalOccupants;
  const commission = perPersonFare * RIDE_CONFIG.commissionRate;
  const finalAmount = perPersonFare - commission;

  return {
    distanceKm: round(distanceKm),
    fuelCost: round(fuelCost),
    tolls: round(tolls),
    totalOccupants,
    poolFare: round(perPersonFare),
    commission: round(commission),
    finalAmount: round(finalAmount),
    formula: `(${round(distanceKm)} km × ₹${RIDE_CONFIG.fuelRatePerKm}/km + ₹${tolls} tolls) ÷ ${totalOccupants} occupants`,
  };
}

/**
 * Calculate no-show penalty.
 * @param {number} fare - The trip fare
 * @returns {{ penaltyAmount: number, driverCompensation: number }}
 */
function calculateNoShowPenalty(fare) {
  let penaltyAmount;

  if (RIDE_CONFIG.noShowPenaltyType === 'percentage') {
    penaltyAmount = fare * (RIDE_CONFIG.noShowPenaltyValue / 100);
  } else {
    penaltyAmount = RIDE_CONFIG.noShowPenaltyValue;
  }

  return {
    penaltyAmount: round(penaltyAmount),
    driverCompensation: round(penaltyAmount), // Full penalty goes to driver
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateFare, calculateNoShowPenalty };
