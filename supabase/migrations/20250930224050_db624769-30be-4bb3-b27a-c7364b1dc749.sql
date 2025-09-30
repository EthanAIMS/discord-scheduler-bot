-- Create bot_status table to control bot operations
CREATE TABLE public.bot_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;

-- Anyone can view status
CREATE POLICY "Anyone can view bot status"
ON public.bot_status
FOR SELECT
USING (true);

-- Only admins can update status
CREATE POLICY "Admins can update bot status"
ON public.bot_status
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Insert initial status row
INSERT INTO public.bot_status (is_active) VALUES (true);

-- Add trigger for updated_at
CREATE TRIGGER update_bot_status_updated_at
  BEFORE UPDATE ON public.bot_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();