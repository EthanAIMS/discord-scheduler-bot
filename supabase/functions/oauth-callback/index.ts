import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    const { serviceId, userDiscordId } = JSON.parse(state);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Calculate expiration
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store or update connection
    const { error: upsertError } = await supabase
      .from("user_service_connections")
      .upsert({
        user_discord_id: userDiscordId,
        service_id: serviceId,
        is_connected: true,
        access_token,
        refresh_token,
        token_expires_at: expiresAt.toISOString(),
        connected_at: new Date().toISOString(),
      }, {
        onConflict: 'user_discord_id,service_id'
      });

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Failed to store connection");
    }

    console.log(`Successfully connected ${userDiscordId} to service ${serviceId}`);

    // Redirect to success page on main app
    const appUrl = "https://7ae35ca4-f7e8-4f1b-9ca8-3114316bc313.lovableproject.com";
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `${appUrl}/oauth-success`,
      },
    });
  } catch (error) {
    console.error("Error in oauth-callback:", error);
    const appUrl = "https://7ae35ca4-f7e8-4f1b-9ca8-3114316bc313.lovableproject.com";
    return new Response(null, {
      status: 302,
      headers: {
        "Location": `${appUrl}/oauth-error`,
      },
    });
  }
});
