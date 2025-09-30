import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Server, Terminal, TrendingUp, Power, PowerOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalServers: 0,
    totalCommands: 0,
    activeCommands: 0,
    recentLogs: 0,
  });
  const [botStatus, setBotStatus] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadStats();
    loadBotStatus();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleData);
    }
  };

  const loadBotStatus = async () => {
    const { data, error } = await supabase
      .from("bot_status")
      .select("*")
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setBotStatus(data);
    }
  };

  const toggleBotStatus = async () => {
    if (!botStatus) return;

    const newStatus = !botStatus.is_active;
    const { error } = await supabase
      .from("bot_status")
      .update({ is_active: newStatus })
      .eq("id", botStatus.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update bot status",
        variant: "destructive",
      });
    } else {
      setBotStatus({ ...botStatus, is_active: newStatus });
      toast({
        title: newStatus ? "Bot Started" : "Bot Stopped",
        description: newStatus 
          ? "Bot is now active and processing commands" 
          : "Bot is paused and will not process commands",
      });
    }
  };

  const loadStats = async () => {
    const [serversResult, commandsResult, logsResult] = await Promise.all([
      supabase.from("discord_servers").select("*", { count: "exact" }),
      supabase.from("bot_commands").select("*", { count: "exact" }),
      supabase
        .from("command_logs")
        .select("*", { count: "exact" })
        .gte("executed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const activeCommands = commandsResult.data?.filter((cmd) => cmd.is_enabled).length || 0;

    setStats({
      totalServers: serversResult.count || 0,
      totalCommands: commandsResult.count || 0,
      activeCommands,
      recentLogs: logsResult.count || 0,
    });
  };

  const statCards = [
    {
      title: "Connected Servers",
      value: stats.totalServers,
      icon: Server,
      color: "text-primary",
    },
    {
      title: "Total Commands",
      value: stats.totalCommands,
      icon: Terminal,
      color: "text-accent",
    },
    {
      title: "Active Commands",
      value: stats.activeCommands,
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "24h Activity",
      value: stats.recentLogs,
      icon: TrendingUp,
      color: "text-blue-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage your Discord bot
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isAdmin && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Bot Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Bot Status</p>
                    <p className="text-sm text-muted-foreground">
                      {botStatus?.is_active ? "Active" : "Stopped"}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${botStatus?.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                </div>
                <Button
                  onClick={toggleBotStatus}
                  className="w-full"
                  variant={botStatus?.is_active ? "destructive" : "default"}
                >
                  {botStatus?.is_active ? (
                    <>
                      <PowerOff className="w-4 h-4 mr-2" />
                      Stop Bot
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4 mr-2" />
                      Start Bot
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>• Manage your bot commands</p>
                <p>• View connected servers</p>
                <p>• Monitor command usage</p>
                <p>• Configure bot settings</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Bot Status</span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    botStatus?.is_active 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-red-500/10 text-red-500'
                  }`}>
                    {botStatus?.is_active ? 'Active' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <span className="text-sm px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API</span>
                  <span className="text-sm px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                    Online
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
