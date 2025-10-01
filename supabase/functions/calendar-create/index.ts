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
    // n8n will handle parsing the date/time strings
    const payload = {
      userDiscordId,
      event: {
        summary: eventData.summary,
        description: eventData.description,
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime
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
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      console.error('Webhook URL used:', N8N_WEBHOOK_URL);
      throw new Error(`n8n webhook failed with status ${response.status}: ${errorText}`);
    }

    const n8nResponse = await response.json();
    console.log('Successfully posted to n8n, response:', n8nResponse);

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
