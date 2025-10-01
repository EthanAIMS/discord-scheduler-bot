-- Allow anonymous users (like the Discord bot) to read enabled commands
CREATE POLICY "Anonymous users can view enabled commands"
ON public.bot_commands
FOR SELECT
TO anon
USING (is_enabled = true);