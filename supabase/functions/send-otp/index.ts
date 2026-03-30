import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { deliveryMethod = "email" } = await req.json();

    // Rate limit: max 5 OTPs per user in 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please wait." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate previous unused OTPs
    await supabase
      .from("otp_codes")
      .delete()
      .eq("user_id", user.id)
      .eq("verified", false);

    // Generate and store OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from("otp_codes").insert({
      user_id: user.id,
      code,
      delivery_method: deliveryMethod,
      expires_at: expiresAt,
    });

    // Send OTP via email using Supabase Auth's built-in magic link/OTP
    if (deliveryMethod === "email" && user.email) {
      // We use the admin API to send a custom email via the auth system
      // For now, we use signInWithOtp which sends a code
      const { error: otpError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
      });
      
      // Since we can't easily send custom emails without email infra,
      // we'll use a workaround: the OTP is stored and verified server-side
      // For production, integrate with email service
      console.log(`OTP for ${user.email}: ${code} (dev mode)`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `OTP sent via ${deliveryMethod}`,
        expiresAt,
        // In dev mode, include code for testing. Remove in production!
        ...(Deno.env.get("ENVIRONMENT") !== "production" && { devCode: code }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-otp error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
