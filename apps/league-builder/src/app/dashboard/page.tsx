import { getCurrentUser } from '@/lib/actions/auth';
import { getCachedDashboardData } from '@/lib/actions/dashboard';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@hockey-life/ui';
import { Plus, Settings } from 'lucide-react';

export default async function DashboardPage() {
  const userData = await getCurrentUser();

  if (!userData) {
    redirect('/login');
  }

  const { user, profile } = userData;
  const dashboardData = await getCachedDashboardData();

  if (!dashboardData) {
    redirect('/login');
  }

  const { organizations, totals } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {profile?.full_name || user.email}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your hockey leagues from one place
            </p>
          </div>
          <Link href="/dashboard/settings">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Your organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {totals.total_organizations}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leagues</CardTitle>
              <CardDescription>Total leagues managed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {totals.total_leagues}
              </div>
              {totals.total_leagues === 0 && (
                <Link
                  href="/dashboard/leagues/new"
                  className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Create your first league
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Total teams across all leagues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {totals.total_teams}
              </div>
              {totals.total_teams > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {totals.total_players} total players
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Organizations</CardTitle>
              <CardDescription>
                Organizations you own or have access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No organizations yet
                  </p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Create Organization
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {org.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {org.slug}
                          </p>
                        </div>
                        <div>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {org.subscription_tier}
                          </span>
                        </div>
                      </div>
                      {org.league_count > 0 && (
                        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Leagues</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {org.league_count}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Teams</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {org.leagues.reduce((sum, l) => sum + l.team_count, 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Players</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {org.leagues.reduce((sum, l) => sum + l.player_count, 0)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <Link
                  href="/dashboard/leagues/new"
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                        Create League
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Set up a new hockey league with our wizard
                      </p>
                    </div>
                  </div>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors text-left group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                        <Settings className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                        Organization Settings
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage profile, team, and billing
                      </p>
                    </div>
                  </div>
                </Link>
                <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors text-left opacity-75">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    Deploy Website
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Launch your league website
                  </p>
                </button>
                <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 transition-colors text-left opacity-75">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                    View Analytics
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Track league performance
                  </p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
