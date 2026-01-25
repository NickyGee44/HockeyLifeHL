"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public page error:", error);
  }, [error]);

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold">Page Error</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't load this page. Please try refreshing.
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
            Refresh page
          </Button>
          <Button
            onClick={() => window.location.href = "/"}
            variant="outline"
            size="sm"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
