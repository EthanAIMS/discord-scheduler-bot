-- Create profiles table for Discord user data
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id text UNIQUE NOT NULL,
  username text NOT NULL,
  discriminator text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_roles table for admin privileges
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create discord_servers table
CREATE TABLE public.discord_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id text UNIQUE NOT NULL,
  server_name text NOT NULL,
  icon_url text,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create bot_commands table
CREATE TABLE public.bot_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_name text NOT NULL,
  description text NOT NULL,
  command_type text NOT NULL DEFAULT 'slash',
  is_enabled boolean NOT NULL DEFAULT true,
  is_admin_only boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(command_name)
);

-- Create command_logs table
CREATE TABLE public.command_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id uuid REFERENCES public.bot_commands(id) ON DELETE CASCADE,
  server_id uuid REFERENCES public.discord_servers(id) ON DELETE CASCADE,
  user_discord_id text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT true,
  error_message text
);

-- Create gcp_operations table for tracking GCP admin operations
CREATE TABLE public.gcp_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  initiated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcp_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for discord_servers
CREATE POLICY "Anyone can view servers"
  ON public.discord_servers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert servers"
  ON public.discord_servers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Admins can update servers"
  ON public.discord_servers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete servers"
  ON public.discord_servers FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bot_commands
CREATE POLICY "Anyone can view commands"
  ON public.bot_commands FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage commands"
  ON public.bot_commands FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for command_logs
CREATE POLICY "Admins can view all logs"
  ON public.command_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
  ON public.command_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for gcp_operations
CREATE POLICY "Admins can view operations"
  ON public.gcp_operations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create operations"
  ON public.gcp_operations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = initiated_by);

CREATE POLICY "Admins can update operations"
  ON public.gcp_operations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discord_servers_updated_at
  BEFORE UPDATE ON public.discord_servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bot_commands_updated_at
  BEFORE UPDATE ON public.bot_commands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, discord_id, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'provider_id',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some default test commands
INSERT INTO public.bot_commands (command_name, description, command_type, is_enabled, is_admin_only) VALUES
  ('ping', 'Test if the bot is operational', 'slash', true, false),
  ('status', 'Check bot status and uptime', 'slash', true, false),
  ('help', 'Display available commands', 'slash', true, false);