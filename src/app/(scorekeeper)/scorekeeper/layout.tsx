import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClipboardList, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { PWAProvider } from "@/components/scorekeeper/PWAProvider";

export default async function ScorekeeperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is a scorekeeper in any league
  const { data: scorekeeperMemberships } = await supabase
    .from('league_scorekeepers')
    .select('id, league_id')
    .eq('scorekeeper_id', user.id)
    .eq('status', 'active');

  if (!scorekeeperMemberships || scorekeeperMemberships.length === 0) {
    // User is not a scorekeeper
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have scorekeeper permissions in any league. Contact your league administrator to be added as a scorekeeper.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PWAProvider>
      <div className="min-h-screen bg-background">
        {/* Scorekeeper Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/scorekeeper/dashboard" className="text-xl font-bold">
                  Scorekeeper
                </Link>
                <nav className="hidden md:flex items-center gap-4">
                  <Link
                    href="/scorekeeper/dashboard"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                  <Link
                    href="/scorekeeper/assignments"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Assignments
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">
                    <LogOut className="h-4 w-4 mr-2" />
                    Exit Scorekeeper Mode
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>

        {/* Scorekeeper Footer */}
        <footer className="border-t bg-muted/50 mt-auto">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
            <p>Scorekeeper Mode • iPad Optimized for Live Stat Entry</p>
          </div>
        </footer>
      </div>
    </PWAProvider>
  );
}
