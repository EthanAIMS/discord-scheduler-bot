import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const OAuthError = () => {
  useEffect(() => {
    // Auto-close after 8 seconds if opened in popup
    const timer = setTimeout(() => {
      if (window.opener) {
        window.close();
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-500 via-red-600 to-pink-600">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center animate-in fade-in-0 zoom-in-95 duration-500">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-red-100 p-4">
            <XCircle className="w-16 h-16 text-red-600 animate-in zoom-in-50 duration-700" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Connection Failed
        </h1>
        
        <p className="text-muted-foreground mb-8 text-lg">
          Something went wrong while connecting your account. Please try again or contact support if the problem persists.
        </p>

        <Button
          onClick={() => window.close()}
          size="lg"
          variant="destructive"
          className="w-full"
        >
          Close Window
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          This window will automatically close in 8 seconds
        </p>
      </div>
    </div>
  );
};

export default OAuthError;
