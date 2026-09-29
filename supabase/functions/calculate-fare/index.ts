/**
 * Supabase Edge Function — calculate-fare
 *
 * Peer-to-Peer Existing-Commute Cost Sharing Formula
 *
 * Total Travel Expense = (Distance km × Fuel Rate) + Tolls
 * Shared Cost Per Occupant = Total Travel Expense ÷ Actual Confirmed Occupants
 * Platform Service Fee = Fixed or separate service fee (e.g. ₹3)
 * Passenger Total = Shared Cost Per Occupant + Platform Fee
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUEL_RATE_PER_KM = 8.0; // ₹8 / km
const PLATFORM_FEE_INR = 3.0; // ₹3 separate platform fee

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { distanceKm, tolls = 0, actualOccupants = 2 } = await req.json();

    const safeDistance = Math.max(0, Number(distanceKm) || 0);
    const safeTolls = Math.max(0, Number(tolls) || 0);
    const occupants = Math.max(1, Number(actualOccupants) || 2);

    const fuelCost = Math.round(safeDistance * FUEL_RATE_PER_KM * 100) / 100;
    const totalTravelExpense = Math.round((fuelCost + safeTolls) * 100) / 100;
    const sharedCostPerOccupant = Math.round((totalTravelExpense / occupants) * 100) / 100;
    const passengerTotal = Math.round((sharedCostPerOccupant + PLATFORM_FEE_INR) * 100) / 100;

    return new Response(
      JSON.stringify({
        distanceKm: safeDistance,
        fuelRate: FUEL_RATE_PER_KM,
        fuelCost,
        tolls: safeTolls,
        totalTravelExpense,
        actualOccupants: occupants,
        sharedCostPerOccupant,
        platformFee: PLATFORM_FEE_INR,
        passengerTotal,
        formula: `(₹${safeDistance}km × ₹${FUEL_RATE_PER_KM}/km + ₹${safeTolls} tolls) ÷ ${occupants} occupants = ₹${sharedCostPerOccupant} shared expense + ₹${PLATFORM_FEE_INR} platform fee`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
