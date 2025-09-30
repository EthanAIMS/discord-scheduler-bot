import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Server, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DiscordServer {
  id: string;
  server_id: string;
  server_name: string;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
}

const Servers = () => {
  const { toast } = useToast();
  const [servers, setServers] = useState<DiscordServer[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    server_id: "",
    server_name: "",
    icon_url: "",
  });

  useEffect(() => {
    checkAdmin();
    loadServers();
  }, []);

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    }
  };

  const loadServers = async () => {
    const { data, error } = await supabase
      .from("discord_servers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load servers",
        variant: "destructive",
      });
    } else {
      setServers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("discord_servers").insert([
      {
        ...formData,
        added_by: user?.id,
      },
    ]);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to add server",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Server added successfully",
      });
      setDialogOpen(false);
      loadServers();
      setFormData({ server_id: "", server_name: "", icon_url: "" });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("discord_servers")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete server",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Server removed successfully",
      });
      loadServers();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Discord Servers
            </h1>
            <p className="text-muted-foreground">
              Manage servers where your bot is active
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Server
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <Card key={server.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {server.icon_url ? (
                        <img
                          src={server.icon_url}
                          alt={server.server_name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Server className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {server.server_name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        ID: {server.server_id}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(server.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant={server.is_active ? "default" : "secondary"}>
                  {server.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {servers.length === 0 && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Server className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No servers yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first Discord server to get started
              </p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Server
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Discord Server</DialogTitle>
              <DialogDescription>
                Register a new server where your bot is active
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server_id">Server ID</Label>
                <Input
                  id="server_id"
                  placeholder="123456789012345678"
                  value={formData.server_id}
                  onChange={(e) =>
                    setFormData({ ...formData, server_id: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server_name">Server Name</Label>
                <Input
                  id="server_name"
                  placeholder="My Awesome Server"
                  value={formData.server_name}
                  onChange={(e) =>
                    setFormData({ ...formData, server_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon_url">Icon URL (Optional)</Label>
                <Input
                  id="icon_url"
                  placeholder="https://cdn.discordapp.com/..."
                  value={formData.icon_url}
                  onChange={(e) =>
                    setFormData({ ...formData, icon_url: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Server</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Servers;
