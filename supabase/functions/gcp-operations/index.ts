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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { operation } = await req.json();
    console.log(`Executing GCP operation: ${operation}`);

    let result;
    let status = "completed";

    // TODO: Replace these with actual GCP API calls
    // For now, we'll simulate the operations
    switch (operation) {
      case "start_server":
        console.log("Starting GCP compute instance...");
        result = { message: "Server start initiated" };
        // Add actual GCP API call here:
        // const compute = new Compute({ projectId, keyFilename });
        // await compute.zone('us-central1-a').vm('instance-name').start();
        break;

      case "stop_server":
        console.log("Stopping GCP compute instance...");
        result = { message: "Server stop initiated" };
        break;

      case "pull_files":
        console.log("Pulling files from GCP...");
        result = { message: "File pull initiated" };
        // Add GCP Storage or SSH file transfer logic here
        break;

      case "push_files":
        console.log("Pushing files to GCP...");
        result = { message: "File push initiated" };
        break;

      case "restart_bot":
        console.log("Restarting Discord bot service...");
        result = { message: "Bot restart initiated" };
        // Add SSH command execution to restart the bot service
        break;

      case "fetch_logs":
        console.log("Fetching server logs...");
        result = {
          message: "Logs fetched",
          logs: [
            "Bot service started successfully",
            "Connected to Discord API",
            "Registered 5 slash commands",
          ],
        };
        break;

      default:
        status = "failed";
        result = { error: "Unknown operation type" };
    }

    // Update operation status in database
    await supabaseClient
      .from("gcp_operations")
      .update({
        status,
        completed_at: new Date().toISOString(),
        details: result,
      })
      .eq("operation_type", operation)
      .eq("initiated_by", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error executing GCP operation:", error);
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
