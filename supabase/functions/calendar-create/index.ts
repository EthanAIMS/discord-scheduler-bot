import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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

    console.log('Sending to n8n webhook:', payload);

    // Build query parameters
    const params = new URLSearchParams({
      userDiscordId: payload.userDiscordId,
      summary: payload.event.summary,
      description: payload.event.description,
      startDateTime: payload.event.startDateTime,
      endDateTime: payload.event.endDateTime
    });

    // GET request to n8n webhook
    const webhookUrl = `${N8N_WEBHOOK_URL}?${params.toString()}`;
    const response = await fetch(webhookUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      console.error('Webhook URL used:', N8N_WEBHOOK_URL);
      throw new Error(`n8n webhook failed with status ${response.status}: ${errorText}`);
    }

    const n8nResponse = await response.json();
    console.log('n8n response:', n8nResponse);

    // Check if n8n returned an error
    if (n8nResponse.error) {
      console.error('n8n parsing error:', n8nResponse.error);
      throw new Error(`Date parsing failed: ${n8nResponse.error.message}`);
    }

    // Get the formatted event from n8n
    const formattedEvent = n8nResponse.event;
    if (!formattedEvent) {
      throw new Error('No event data returned from n8n');
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's Google Calendar connection
    const { data: connection, error: connectionError } = await supabase
      .from('user_service_connections')
      .select('access_token, service_id, available_services(service_name)')
      .eq('user_discord_id', userDiscordId)
      .eq('is_connected', true)
      .single();

    if (connectionError || !connection) {
      console.error('Failed to get user connection:', connectionError);
      throw new Error('User has not connected their Google Calendar');
    }

    // Verify it's a Google Calendar connection
    const serviceName = (connection.available_services as any)?.service_name;
    if (serviceName !== 'google_calendar') {
      throw new Error('No Google Calendar connection found');
    }

    if (!connection.access_token) {
      throw new Error('No access token available for Google Calendar');
    }

    console.log('Creating event in Google Calendar...');

    // Create event in Google Calendar
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedEvent),
      }
    );

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text();
      console.error('Google Calendar API error:', calendarResponse.status, errorText);
      throw new Error(`Failed to create calendar event: ${errorText}`);
    }

    const createdEvent = await calendarResponse.json();
    console.log('Successfully created event:', createdEvent.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event created successfully',
        eventId: createdEvent.id,
        eventLink: createdEvent.htmlLink
      }),
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
