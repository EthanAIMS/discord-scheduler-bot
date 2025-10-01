-- Update Google Calendar OAuth scope to allow creating events (not just reading)
UPDATE available_services 
SET oauth_scope = 'https://www.googleapis.com/auth/calendar' 
WHERE service_name = 'calendar';