"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">Dashboard Error</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't load this dashboard section. Please try again.
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
            onClick={() => window.location.href = "/dashboard"}
            variant="outline"
            size="sm"
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard Home
          </Button>
        </div>
      </div>
    </div>
  );
}
