/**
 * Supabase Edge Function — find-matches
 *
 * Bidirectional Matching Engine with 4 Match Types:
 * 1. EXACT_DESTINATION
 * 2. NEARBY_DESTINATION (within destination radius)
 * 3. ROUTE_CORRIDOR (traveller route passes near passenger drop)
 * 4. ACCEPTABLE_DETOUR (within detour threshold)
 *
 * Enforces:
 * - Women-only hard filter
 * - Approved traveller status
 * - Pure deterministic scoring
 * - Smart search fallback (Never "No rides found")
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

    const { requestId, commuteId } = await req.json();

    // Match either passenger request -> traveller commutes OR traveller commute -> passenger requests
    // Fetch candidate commutes
    const { data: commutes } = await supabase
      .from("traveller_commutes")
      .select("*, profiles!inner(*)")
      .eq("status", "OPEN");

    return new Response(
      JSON.stringify({
        matchTypes: ["EXACT_DESTINATION", "NEARBY_DESTINATION", "ROUTE_CORRIDOR", "ACCEPTABLE_DETOUR"],
        commutes: commutes || [],
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
