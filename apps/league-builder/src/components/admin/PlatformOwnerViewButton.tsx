import { startPlatformOwnerView } from '@/lib/actions/platform-owner-view';

export default function PlatformOwnerViewButton({
  leagueId,
  locale,
  redirectTo,
  className,
  label = 'View owner setup',
}: {
  leagueId: string;
  locale: string;
  redirectTo?: string;
  className?: string;
  label?: string;
}) {
  return (
    <form action={startPlatformOwnerView}>
      <input type="hidden" name="leagueId" value={leagueId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="redirectTo" value={redirectTo ?? `/dashboard/leagues/${leagueId}`} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
