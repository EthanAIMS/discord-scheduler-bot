import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleDiscordLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to sign in with Discord",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-background/80">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(235_86%_65%/0.1),transparent_50%)]" />
      
      <Card className="w-full max-w-md p-8 space-y-6 relative overflow-hidden border-primary/20 bg-card/50 backdrop-blur-sm shadow-[var(--shadow-card)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="relative space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
              <Bot className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Discord Bot Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your Discord bot with ease
          </p>
        </div>

        <div className="relative space-y-4">
          <Button
            onClick={handleDiscordLogin}
            disabled={loading}
            className="w-full h-12 text-lg font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white"
          >
            {loading ? (
              "Connecting..."
            ) : (
              <>
                <Shield className="mr-2 h-5 w-5" />
                Sign in with Discord
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Secure authentication powered by Discord OAuth
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
