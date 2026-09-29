/**
 * Supabase Edge Function — verify-trip-start-otp
 *
 * Validates Traveller's input of the Passenger's Trip Start OTP.
 * On success: Transitions trip to IN_PROGRESS.
 * Server-enforced rate limiting and attempt limits (max 5).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

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

    const { tripId, enteredOtp } = await req.json();

    if (!tripId || !enteredOtp) {
      return new Response(JSON.stringify({ error: "Missing tripId or enteredOtp" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch latest active OTP
    const { data: otpRecord, error: otpErr } = await supabase
      .from("trip_start_otps")
      .select("*")
      .eq("trip_id", tripId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpErr || !otpRecord) {
      return new Response(
        JSON.stringify({
          error: "OTP_NOT_FOUND",
          message: "No active trip code found. Request a fresh code from the passenger.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check Expiration
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from("trip_start_otps").update({ status: "EXPIRED" }).eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({
          error: "TRIP_CODE_EXPIRED",
          message: "Trip code expired. Passenger must generate a new code.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check Attempts
    if (otpRecord.attempt_count >= otpRecord.max_attempts) {
      await supabase.from("trip_start_otps").update({ status: "LOCKED" }).eq("id", otpRecord.id);
      return new Response(
        JSON.stringify({
          error: "MAX_ATTEMPTS_EXCEEDED",
          message: "Too many failed attempts. Code locked for security.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Hash entered OTP
    const msgBuffer = new TextEncoder().encode(enteredOtp.trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const enteredHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // 5. Compare
    if (enteredHash !== otpRecord.otp_hash) {
      await supabase
        .from("trip_start_otps")
        .update({ attempt_count: otpRecord.attempt_count + 1 })
        .eq("id", otpRecord.id);

      const remaining = otpRecord.max_attempts - (otpRecord.attempt_count + 1);
      return new Response(
        JSON.stringify({
          error: "INVALID_TRIP_CODE",
          message: `Invalid trip code. Check the code shown by the passenger. (${remaining} attempts remaining)`,
          remainingAttempts: remaining,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Success! Transition trip to IN_PROGRESS
    await supabase
      .from("trip_start_otps")
      .update({ status: "USED", used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    await supabase
      .from("confirmed_trips")
      .update({
        status: "IN_PROGRESS",
        started_at: new Date().toISOString(),
        trip_start_otp_status: "VERIFIED",
      })
      .eq("id", tripId);

    return new Response(
      JSON.stringify({
        success: true,
        status: "IN_PROGRESS",
        message: "Trip start OTP verified. Commute is now IN PROGRESS!",
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
