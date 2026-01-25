"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Authentication error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">Authentication Error</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't process your authentication request.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg bg-muted p-3 text-left">
            <p className="text-xs font-mono text-destructive">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button onClick={reset} size="sm">
            Try again
          </Button>
          <Button
            onClick={() => window.location.href = "/login"}
            variant="outline"
            size="sm"
          >
            Back to login
          </Button>
        </div>
      </div>
    </div>
  );
}
