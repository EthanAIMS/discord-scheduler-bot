import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    switch (path) {
      case "commands": {
        // Get all enabled commands
        const { data, error } = await supabaseClient
          .from("bot_commands")
          .select("*")
          .eq("is_enabled", true)
          .order("command_name");

        if (error) throw error;

        return new Response(JSON.stringify({ commands: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "log-command": {
        // Log command execution
        const { command_id, server_id, user_discord_id, success, error_message } =
          await req.json();

        const { error } = await supabaseClient.from("command_logs").insert([
          {
            command_id,
            server_id,
            user_discord_id,
            success,
            error_message,
          },
        ]);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "servers": {
        // Get all active servers
        const { data, error } = await supabaseClient
          .from("discord_servers")
          .select("*")
          .eq("is_active", true);

        if (error) throw error;

        return new Response(JSON.stringify({ servers: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "status": {
        // Get bot active status
        const { data, error } = await supabaseClient
          .from("bot_status")
          .select("is_active")
          .limit(1)
          .single();

        if (error) {
          // If no status exists, default to active
          return new Response(
            JSON.stringify({ isActive: true }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({ isActive: data.is_active }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "ping": {
        // Simple health check endpoint
        return new Response(
          JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      case "services": {
        // Get all active services
        const { data, error } = await supabaseClient
          .from("available_services")
          .select("*")
          .eq("is_active", true)
          .order("service_name");

        if (error) throw error;

        return new Response(JSON.stringify({ services: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "user-connections": {
        // Get user's service connections
        const { userDiscordId } = await req.json();
        
        const { data, error } = await supabaseClient
          .from("user_service_connections")
          .select(`
            *,
            service:available_services(*)
          `)
          .eq("user_discord_id", userDiscordId);

        if (error) throw error;

        return new Response(JSON.stringify({ connections: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect-service": {
        // Disconnect a service
        const { userDiscordId, serviceId } = await req.json();

        const { error } = await supabaseClient
          .from("user_service_connections")
          .update({
            is_connected: false,
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
          })
          .eq("user_discord_id", userDiscordId)
          .eq("service_id", serviceId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Endpoint not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error in bot-api:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
