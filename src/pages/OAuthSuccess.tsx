import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const OAuthSuccess = () => {
  useEffect(() => {
    // Auto-close after 5 seconds if opened in popup
    const timer = setTimeout(() => {
      if (window.opener) {
        window.close();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary via-primary/80 to-accent">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center animate-in fade-in-0 zoom-in-95 duration-500">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 animate-in zoom-in-50 duration-700" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Successfully Connected!
        </h1>
        
        <p className="text-muted-foreground mb-8 text-lg">
          Your account has been linked. You can now close this window and return to Discord to use your connected services.
        </p>

        <Button
          onClick={() => window.close()}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
        >
          Close Window
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          This window will automatically close in 5 seconds
        </p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
