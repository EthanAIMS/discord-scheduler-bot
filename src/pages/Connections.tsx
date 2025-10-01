import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "lucide-react";

type Service = {
  id: string;
  service_name: string;
  display_name: string;
  icon_emoji: string;
  oauth_scope: string;
  is_active: boolean;
};

type Connection = {
  id: string;
  user_discord_id: string;
  service_id: string;
  is_connected: boolean;
  connected_at: string | null;
  service: Service;
};

const Connections = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to view connections",
          variant: "destructive",
        });
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Load all available services
      const { data: servicesData, error: servicesError } = await supabase
        .from("available_services")
        .select("*")
        .eq("is_active", true)
        .order("service_name");

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Load user's connections if they have a Discord ID
      if (profileData?.discord_id) {
        const { data: connectionsData, error: connectionsError } = await supabase
          .from("user_service_connections")
          .select(`
            *,
            service:available_services(*)
          `)
          .eq("user_discord_id", profileData.discord_id);

        if (connectionsError) throw connectionsError;
        setConnections(connectionsData || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load connection data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = (serviceId: string) => {
    const connection = connections.find(
      (c) => c.service_id === serviceId && c.is_connected
    );
    return connection;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Service Connections
            </h1>
            <p className="text-muted-foreground">
              Manage your connected services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile?.discord_id) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Service Connections
            </h1>
            <p className="text-muted-foreground">
              Manage your connected services
            </p>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Discord Account Required</CardTitle>
              <CardDescription>
                You need to link your Discord account to use service connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Please sign in with Discord to manage your service connections. Use the <code className="px-2 py-1 bg-muted rounded">/connect</code> command in Discord to set up your connections.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Service Connections
          </h1>
          <p className="text-muted-foreground">
            View and manage your connected services
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              How to Connect Services
            </CardTitle>
            <CardDescription>
              Use the <code className="px-2 py-1 bg-muted rounded text-xs">/connect</code> command in Discord to connect or disconnect services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Run the command in your Discord server, then click the buttons to authorize each service. Once connected, your connections will appear here.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const connection = getConnectionStatus(service.id);
            return (
              <Card
                key={service.id}
                className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <span className="text-2xl">{service.icon_emoji}</span>
                      {service.display_name}
                    </CardTitle>
                    <Badge variant={connection ? "default" : "secondary"}>
                      {connection ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {connection
                      ? `Connected on ${new Date(connection.connected_at!).toLocaleDateString()}`
                      : "Not connected yet"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Status: </span>
                      {connection ? (
                        <span className="text-green-500 font-medium">
                          ✓ Active
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Use <code className="px-1 bg-muted rounded">/connect</code> in Discord to manage
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Connections;
