import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Server,
  Upload,
  Download,
  Power,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface GCPOperation {
  id: string;
  operation_type: string;
  status: string;
  details: any;
  created_at: string;
  completed_at: string | null;
}

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState<GCPOperation[]>([]);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/dashboard");
    } else {
      setIsAdmin(true);
      loadOperations();
    }
  };

  const loadOperations = async () => {
    const { data, error } = await supabase
      .from("gcp_operations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setOperations(data);
    }
  };

  const executeGCPOperation = async (operationType: string) => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Log the operation
      const { error } = await supabase.from("gcp_operations").insert([
        {
          operation_type: operationType,
          status: "pending",
          initiated_by: user?.id,
          details: { timestamp: new Date().toISOString() },
        },
      ]);

      if (error) throw error;

      // Call the GCP edge function
      const { data, error: functionError } = await supabase.functions.invoke(
        "gcp-operations",
        {
          body: { operation: operationType },
        }
      );

      if (functionError) throw functionError;

      toast({
        title: "Success",
        description: `GCP ${operationType} operation initiated`,
      });

      loadOperations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to execute operation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const gcpOperations = [
    {
      title: "Start GCP Server",
      description: "Power on your GCP compute instance",
      icon: Power,
      action: () => executeGCPOperation("start_server"),
      color: "text-green-500",
    },
    {
      title: "Stop GCP Server",
      description: "Shut down your GCP compute instance",
      icon: Power,
      action: () => executeGCPOperation("stop_server"),
      color: "text-red-500",
    },
    {
      title: "Pull Files",
      description: "Download files from GCP to local",
      icon: Download,
      action: () => executeGCPOperation("pull_files"),
      color: "text-blue-500",
    },
    {
      title: "Push Files",
      description: "Upload files from local to GCP",
      icon: Upload,
      action: () => executeGCPOperation("push_files"),
      color: "text-purple-500",
    },
    {
      title: "Restart Bot",
      description: "Restart the Discord bot service",
      icon: RefreshCw,
      action: () => executeGCPOperation("restart_bot"),
      color: "text-yellow-500",
    },
    {
      title: "View Logs",
      description: "Fetch and display server logs",
      icon: Terminal,
      action: () => executeGCPOperation("fetch_logs"),
      color: "text-cyan-500",
    },
  ];

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Manage GCP server and system operations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gcpOperations.map((operation) => {
            const Icon = operation.icon;
            return (
              <Card
                key={operation.title}
                className="border-border/50 hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${operation.color}`} />
                        {operation.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {operation.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={operation.action}
                    disabled={loading}
                    className="w-full"
                  >
                    Execute
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Recent Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No operations yet
                </p>
              ) : (
                operations.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{op.operation_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(op.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        op.status === "completed"
                          ? "default"
                          : op.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {op.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Admin Access Required</p>
                <p className="text-sm text-muted-foreground">
                  These operations require admin privileges and directly interact
                  with your GCP infrastructure. Make sure you have configured your
                  GCP credentials in the backend before executing operations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
