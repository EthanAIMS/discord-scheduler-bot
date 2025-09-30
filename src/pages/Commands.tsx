import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Terminal, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Command {
  id: string;
  command_name: string;
  description: string;
  command_type: string;
  is_enabled: boolean;
  is_admin_only: boolean;
}

const Commands = () => {
  const { toast } = useToast();
  const [commands, setCommands] = useState<Command[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [formData, setFormData] = useState({
    command_name: "",
    description: "",
    command_type: "slash",
    is_enabled: true,
    is_admin_only: false,
  });

  useEffect(() => {
    checkAdmin();
    loadCommands();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

  const loadCommands = async () => {
    const { data, error } = await supabase
      .from("bot_commands")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load commands",
        variant: "destructive",
      });
    } else {
      setCommands(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (editingCommand) {
      const { error } = await supabase
        .from("bot_commands")
        .update(formData)
        .eq("id", editingCommand.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update command",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Command updated successfully",
        });
        setDialogOpen(false);
        loadCommands();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("bot_commands")
        .insert([{ ...formData, created_by: user?.id }]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create command",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Command created successfully",
        });
        setDialogOpen(false);
        loadCommands();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("bot_commands")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete command",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Command deleted successfully",
      });
      loadCommands();
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const { error } = await supabase
      .from("bot_commands")
      .update({ is_enabled: enabled })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update command",
        variant: "destructive",
      });
    } else {
      loadCommands();
    }
  };

  const resetForm = () => {
    setFormData({
      command_name: "",
      description: "",
      command_type: "slash",
      is_enabled: true,
      is_admin_only: false,
    });
    setEditingCommand(null);
  };

  const openEditDialog = (command: Command) => {
    setEditingCommand(command);
    setFormData({
      command_name: command.command_name,
      description: command.description,
      command_type: command.command_type,
      is_enabled: command.is_enabled,
      is_admin_only: command.is_admin_only,
    });
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Commands
            </h1>
            <p className="text-muted-foreground">
              Manage your bot's slash commands
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Command
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commands.map((command) => (
            <Card key={command.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Terminal className="w-4 h-4" />
                      /{command.command_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {command.description}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(command)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(command.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {isAdmin ? (
                    <Switch
                      checked={command.is_enabled}
                      onCheckedChange={(checked) =>
                        handleToggle(command.id, checked)
                      }
                    />
                  ) : (
                    <Badge variant={command.is_enabled ? "default" : "secondary"}>
                      {command.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  )}
                </div>
                {command.is_admin_only && (
                  <Badge variant="outline" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Admin Only
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCommand ? "Edit Command" : "Add New Command"}
              </DialogTitle>
              <DialogDescription>
                {editingCommand
                  ? "Update the command details below"
                  : "Create a new bot command"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="command_name">Command Name</Label>
                <Input
                  id="command_name"
                  placeholder="ping"
                  value={formData.command_name}
                  onChange={(e) =>
                    setFormData({ ...formData, command_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this command does..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_enabled"
                  checked={formData.is_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_enabled: checked })
                  }
                />
                <Label htmlFor="is_enabled">Enabled</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_admin_only"
                  checked={formData.is_admin_only}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_admin_only: checked })
                  }
                />
                <Label htmlFor="is_admin_only">Admin Only</Label>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCommand ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Commands;
