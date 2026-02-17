/**
 * League Payment Links Component
 *
 * Displays per-league Stripe Connect billing status and links
 * to individual league billing dashboards.
 */

import { Link } from '@/i18n/navigation';
import { CreditCard, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@hockey-life/ui';
import { LeagueLogo } from '@/components/ui/league-logo';

interface League {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  stripe_account_id: string | null;
  stripe_account_status: string | null;
}

interface LeaguePaymentLinksProps {
  leagues: League[];
}

export function LeaguePaymentLinks({ leagues }: LeaguePaymentLinksProps) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-xl bg-rink-500/10">
          <CreditCard className="w-6 h-6 text-rink-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">League Payment Processing</h2>
          <p className="text-neutral-400 text-sm">
            Manage Stripe Connect accounts and payment settings for each league.
          </p>
        </div>
      </div>

      {leagues.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
            Your Leagues
          </h3>
          <div className="space-y-3">
            {leagues.map((league) => {
              const isConnected = league.stripe_account_status === 'complete';
              const needsSetup = !league.stripe_account_id;

              return (
                <Link
                  key={league.id}
                  href={`/dashboard/leagues/${league.id}/billing`}
                  className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl hover:bg-neutral-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <LeagueLogo
                      logoUrl={league.logo_url}
                      leagueName={league.name}
                      primaryColor={league.primary_color || '#22D3EE'}
                      size="xs"
                      shape="square"
                    />
                    <div>
                      <h4 className="font-medium text-white group-hover:text-rink-500 transition-colors">
                        {league.name}
                      </h4>
                      <p className="text-xs text-neutral-500">
                        {isConnected ? (
                          <span className="text-green-500">Stripe Connected</span>
                        ) : needsSetup ? (
                          <span className="text-yellow-500">Setup Required</span>
                        ) : (
                          <span className="text-yellow-500">Pending Setup</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500 group-hover:text-rink-500 transition-colors">
                    <span className="text-sm">Manage Billing</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Leagues Yet</h3>
          <p className="text-neutral-400 mb-4">
            Create your first league to set up payment processing.
          </p>
          <Link
            href="/dashboard/leagues/new"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm',
              'bg-gradient-to-r from-rink-500 to-arena-500 text-black',
              'hover:shadow-lg hover:shadow-rink-500/20 transition-all'
            )}
          >
            Create League
          </Link>
        </div>
      )}
    </div>
  );
}
