import { Globe, Mail, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface PremiumServicesCardProps {
  domainsHref: string;
}

export function PremiumServicesCard({ domainsHref }: PremiumServicesCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
      <div className="mb-4 flex items-start gap-4">
        <div className="rounded-xl bg-rink-500/10 p-3">
          <Sparkles className="h-6 w-6 text-rink-500" />
        </div>
        <div>
          <h2 className="mb-1 text-lg font-bold text-white">Launch and migration help</h2>
          <p className="text-sm text-neutral-400">
            Domain setup is self-serve in the league builder. Historic imports and special rollout work still start with a scoped migration request.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-neutral-800/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-white">
            <Globe className="h-4 w-4 text-rink-500" />
            <h3 className="font-medium">Custom domain</h3>
          </div>
          <p className="mb-3 text-sm text-neutral-400">
            Connect or buy your league domain from the built-in wizard. No separate quote is required.
          </p>
          <Link
            href={domainsHref}
            className="inline-flex items-center gap-1 text-sm text-rink-500 transition-colors hover:text-rink-400"
          >
            Open domain settings
          </Link>
        </div>

        <div className="rounded-xl bg-neutral-800/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-white">
            <Mail className="h-4 w-4 text-rink-500" />
            <h3 className="font-medium">Historic data import</h3>
          </div>
          <p className="mb-3 text-sm text-neutral-400">
            Need standings history, stats, champions, or archived content moved over? We scope that as part of migration support.
          </p>
          <a
            href="mailto:support@beerleaguehockey.ca?subject=Historic Data Import Inquiry"
            className="inline-flex items-center gap-1 text-sm text-rink-500 transition-colors hover:text-rink-400"
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
