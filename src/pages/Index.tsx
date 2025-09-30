import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Terminal, Server, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const features = [
    {
      icon: Terminal,
      title: "Command Manager",
      description: "Create and manage Discord slash commands with ease",
    },
    {
      icon: Server,
      title: "Multi-Server",
      description: "Monitor and control your bot across multiple Discord servers",
    },
    {
      icon: Shield,
      title: "Admin Controls",
      description: "Manage your GCP infrastructure directly from the dashboard",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(235_86%_65%/0.15),transparent_50%)]" />
      
      <div className="relative">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-20 pb-32">
          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
              <Bot className="w-16 h-16 text-white" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Discord Bot
              </span>
              <br />
              Control Center
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl">
              A powerful dashboard to manage your Discord bot, commands, servers,
              and GCP infrastructure all in one place.
            </p>
            
            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-lg"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-lg"
              >
                Sign In
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-colors backdrop-blur-sm"
                >
                  <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
