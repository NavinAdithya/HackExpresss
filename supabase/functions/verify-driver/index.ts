/**
 * Supabase Edge Function — verify-driver
 *
 * Traveller Verification Endpoint
 * Submits Driving Licence + Identity Document + Vehicle information
 *
 * MOCKED FOR DEMO:
 * Driver document verification approval is simulated.
 * Production requires a compliant identity-verification process.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, licenseNumber, vehicleModel, vehicleNumber, transportMode } = await req.json();

    if (!userId || !licenseNumber || !vehicleNumber) {
      return new Response(JSON.stringify({ error: "Missing required documents/info" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MOCKED FOR DEMO:
    // Driver document verification approval is simulated.
    // Production requires a compliant identity-verification process.
    const status = "APPROVED";

    await supabase.from("driver_profiles").upsert({
      user_id: userId,
      transport_mode: transportMode || "BIKE",
      vehicle_model: vehicleModel || "Two-Wheeler",
      vehicle_registration: vehicleNumber,
      driver_status: status,
      vehicle_capacity: transportMode === "CAR" ? 3 : 1,
      available_seats: transportMode === "CAR" ? 2 : 1,
    });

    await supabase.from("driver_verifications").insert({
      user_id: userId,
      license_doc_path: `licenses/${userId}_license.pdf`,
      id_doc_path: `ids/${userId}_id.pdf`,
      status,
      reviewer_notes: "Automated verification passed for hackathon demo",
      verified_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        driverStatus: status,
        message: "Traveller verification approved! You can now share your commute.",
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
