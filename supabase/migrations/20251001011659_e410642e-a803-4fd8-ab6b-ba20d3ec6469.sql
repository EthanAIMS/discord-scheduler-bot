-- Create available_services table
CREATE TABLE public.available_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon_emoji TEXT NOT NULL,
  oauth_scope TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_service_connections table
CREATE TABLE public.user_service_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_discord_id TEXT NOT NULL,
  service_id UUID NOT NULL REFERENCES public.available_services(id) ON DELETE CASCADE,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_discord_id, service_id)
);

-- Enable Row Level Security
ALTER TABLE public.available_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_service_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for available_services
CREATE POLICY "Anyone can view active services"
  ON public.available_services
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage services"
  ON public.available_services
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_service_connections
CREATE POLICY "Users can view their own connections"
  ON public.user_service_connections
  FOR SELECT
  USING (auth.uid()::text = user_discord_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert connections"
  ON public.user_service_connections
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update connections"
  ON public.user_service_connections
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete connections"
  ON public.user_service_connections
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_user_service_connections_updated_at
  BEFORE UPDATE ON public.user_service_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the three Google services
INSERT INTO public.available_services (service_name, display_name, icon_emoji, oauth_scope) VALUES
  ('gmail', 'Gmail', '📧', 'https://www.googleapis.com/auth/gmail.readonly'),
  ('drive', 'Google Drive', '📁', 'https://www.googleapis.com/auth/drive.readonly'),
  ('calendar', 'Google Calendar', '📅', 'https://www.googleapis.com/auth/calendar.readonly');