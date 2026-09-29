/**
 * Fare Calculator — P2P Existing-Commute Cost Sharing
 *
 * Formula:
 *   Total Travel Expense = (Distance km × Fuel Rate) + Tolls
 *   Shared Cost Per Occupant = Total Travel Expense ÷ Actual Confirmed Occupants
 *   Passenger Total = Shared Cost Per Occupant + PO → PO Platform Fee
 *
 * The platform fee is displayed as a separate line item and never disguised as fuel cost.
 * For Travellers:
 *   Effective Personal Expense = Total Travel Expense - Passenger Contribution
 *   No commercial driver earnings, taxi profits, or surge pricing.
 */

const RIDE_CONFIG = require('../config/ride');

/**
 * Calculate transparent expense-sharing breakdown.
 * PURE FUNCTION — no side effects.
 *
 * @param {number} distanceMeters - Route distance in meters (from OSRM)
 * @param {number} tolls - Toll amount (₹), default 0
 * @param {number} actualOccupants - Actual confirmed occupants in vehicle (default 2)
 * @returns {Object} Complete cost-sharing breakdown
 */
function calculateFare(distanceMeters, tolls = 0, actualOccupants = 2) {
  const occupants = Math.max(1, actualOccupants);
  const safeDistance = Math.max(0, distanceMeters);

  const distanceKm = safeDistance / 1000;
  const fuelCost = distanceKm * RIDE_CONFIG.fuelRatePerKm;
  const totalTravelExpense = fuelCost + (tolls || 0);

  // Divide by ACTUAL confirmed occupants, never maximum capacity
  const sharedCostPerOccupant = totalTravelExpense / occupants;
  const commission = sharedCostPerOccupant * 0.10;
  const finalAmount = sharedCostPerOccupant - commission;
  const platformFee = RIDE_CONFIG.platformFee || 3.0;
  const passengerTotal = sharedCostPerOccupant + platformFee;

  // Traveller perspective
  const travellerEffectiveExpense = totalTravelExpense - sharedCostPerOccupant;

  return {
    distanceKm: round(distanceKm),
    fuelRate: RIDE_CONFIG.fuelRatePerKm,
    fuelCost: round(fuelCost),
    tolls: round(tolls || 0),
    totalOccupants: occupants,
    actualOccupants: occupants,
    totalTravelExpense: round(totalTravelExpense),
    poolFare: round(sharedCostPerOccupant),
    sharedCostPerPerson: round(sharedCostPerOccupant),
    commission: round(commission),
    finalAmount: round(finalAmount),
    platformFee: round(platformFee),
    passengerTotal: round(passengerTotal),
    travellerEffectiveExpense: round(travellerEffectiveExpense),
    formula: `(${round(distanceKm)} km × ₹${RIDE_CONFIG.fuelRatePerKm}/km + ₹${tolls || 0} tolls) ÷ ${occupants} occupants = ₹${round(sharedCostPerOccupant)} shared expense + ₹${platformFee} platform fee`,
  };
}

/**
 * Calculate no-show penalty.
 * @param {number} sharedCost - The passenger's shared contribution
 * @returns {{ penaltyAmount: number, driverCompensation: number }}
 */
function calculateNoShowPenalty(sharedCost) {
  let penaltyAmount;

  if (RIDE_CONFIG.noShowPenaltyType === 'percentage') {
    penaltyAmount = sharedCost * (RIDE_CONFIG.noShowPenaltyValue / 100);
  } else {
    penaltyAmount = RIDE_CONFIG.noShowPenaltyValue;
  }

  return {
    penaltyAmount: round(penaltyAmount),
    driverCompensation: round(penaltyAmount),
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateFare, calculateNoShowPenalty };
