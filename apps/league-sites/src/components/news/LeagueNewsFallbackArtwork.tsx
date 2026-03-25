'use client';

interface LeagueNewsFallbackArtworkProps {
  leagueName: string;
  leagueLogoUrl?: string | null;
  articleType?: string | null;
  emphasis?: 'hero' | 'card' | 'compact';
}

function getLeagueInitials(leagueName: string) {
  return leagueName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

function getArticleLabel(articleType?: string | null) {
  if (articleType === 'game_recap') return 'Game Recap';
  if (articleType === 'weekly_wrap') return 'Weekly Wrap';
  if (articleType === 'announcement') return 'Announcement';
  return 'League Story';
}

export function LeagueNewsFallbackArtwork({
  leagueName,
  leagueLogoUrl,
  articleType,
  emphasis = 'card',
}: LeagueNewsFallbackArtworkProps) {
  const compact = emphasis === 'compact';
  const hero = emphasis === 'hero';
  const leagueInitials = getLeagueInitials(leagueName);
  const articleLabel = getArticleLabel(articleType);

  if (hero) {
    return (
      <div className="relative isolate h-full w-full overflow-hidden bg-slate-950">
        <img src="/rink.png" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,13,24,0.18)_0%,rgba(7,13,24,0.32)_36%,rgba(7,13,24,0.58)_100%)]" />
        {leagueLogoUrl ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={leagueLogoUrl}
              alt={`${leagueName} logo`}
              className="h-28 w-28 object-contain opacity-[0.22] drop-shadow-[0_24px_48px_rgba(0,0,0,0.42)] md:h-40 md:w-40"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative isolate h-full w-full overflow-hidden bg-[linear-gradient(180deg,#edf4fb_0%,#d7e5f4_100%)] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_48%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.12),transparent_42%)]" />
      <div className="absolute inset-[7%] rounded-[32px] border border-white/70 bg-white/30" />
      <div className="absolute inset-y-[14%] left-1/2 w-px -translate-x-1/2 bg-red-400/35" />
      <div className="absolute inset-y-[14%] left-[28%] w-px bg-sky-300/40" />
      <div className="absolute inset-y-[14%] right-[28%] w-px bg-sky-300/40" />
      <div className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-400/40" />
      <div className="absolute left-[16%] top-1/2 h-[20%] w-[10%] -translate-y-1/2 rounded-r-[999px] border border-red-400/32 border-l-0" />
      <div className="absolute right-[16%] top-1/2 h-[20%] w-[10%] -translate-y-1/2 rounded-l-[999px] border border-red-400/32 border-r-0" />
      <div className="absolute inset-x-0 bottom-0 h-[52%] bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.1)_48%,rgba(15,23,42,0.5)_100%)]" />

      <div
        className={`relative z-10 flex h-full flex-col justify-between ${
          compact ? 'p-2.5' : hero ? 'p-5 md:p-6' : 'p-4'
        }`}
      >
        <div className="inline-flex w-fit items-center rounded-full border border-slate-900/10 bg-white/72 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur-sm">
          {articleLabel}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={`font-black tracking-tight text-slate-950 ${compact ? 'text-xs' : hero ? 'text-base md:text-lg' : 'text-sm'}`}>
              {leagueName}
            </p>
            <p className={`mt-1 uppercase tracking-[0.18em] text-slate-700/80 ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
              Ice-level coverage
            </p>
          </div>

          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-white/70 bg-white/78 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.55)] ${
              compact ? 'h-10 w-10 p-1.5' : hero ? 'h-16 w-16 p-2.5 md:h-20 md:w-20' : 'h-14 w-14 p-2'
            }`}
          >
            {leagueLogoUrl ? (
              <img
                src={leagueLogoUrl}
                alt={`${leagueName} logo`}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className={`font-black text-slate-900 ${compact ? 'text-xs' : hero ? 'text-lg md:text-xl' : 'text-sm'}`}>
                {leagueInitials}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeagueNewsFallbackArtwork;
