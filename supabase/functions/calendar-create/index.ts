import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userDiscordId, eventData } = await req.json();
    console.log('Calendar create request received for user:', userDiscordId);

    const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL');
    if (!N8N_WEBHOOK_URL) {
      throw new Error('N8N_WEBHOOK_URL not configured');
    }

    // Prepare the payload for n8n
    // This structure is what will eventually be needed to create a Google Calendar event
    const payload = {
      userDiscordId,
      event: {
        summary: eventData.summary,        // Event title
        description: eventData.description, // Event description
        start: {
          dateTime: eventData.startDateTime, // ISO 8601 format: "2025-10-15T10:00:00"
          timeZone: "America/Los_Angeles"
        },
        end: {
          dateTime: eventData.endDateTime,   // ISO 8601 format: "2025-10-15T11:00:00"
          timeZone: "America/Los_Angeles"
        }
      }
    };

    console.log('Posting to n8n webhook:', payload);

    // Post to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('n8n webhook error:', response.status, await response.text());
      throw new Error(`n8n webhook failed with status ${response.status}`);
    }

    console.log('Successfully posted to n8n');

    return new Response(
      JSON.stringify({ success: true, message: 'Event data sent to n8n' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in calendar-create function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
