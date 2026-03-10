/**
 * Public demo page — no authentication required.
 * Shows the printable game sheet template with realistic mock data
 * so stakeholders can preview the layout before it's used in production.
 *
 * URL: /en/print-sheet-demo (or /fr/print-sheet-demo)
 */
import { setRequestLocale } from 'next-intl/server';
import { PrintableGameSheet, type RosterPlayer } from '@/components/games/PrintableGameSheet';
import { PrintButton } from '@/components/games/PrintButton';

type Props = {
  params: Promise<{ locale: string }>;
};

export const metadata = {
  title: 'Game Sheet Preview — HockeyLife HL',
};

const DEMO_GAME_SCHEDULED_AT = '2026-03-11T23:15:00.000Z';

// ── Mock data — realistic beer-league players ─────────────────────────────────

function makeRoster(players: [number, string, boolean?][]): RosterPlayer[] {
  return players.map(([num, name, goalie]) => ({
    jerseyNumber: num,
    fullName: name,
    isGoalie: goalie ?? false,
  }));
}

const HOME_ROSTER = makeRoster([
  [1,  'T. Bergeron',   true],
  [4,  'B. Orr'],
  [7,  'P. Esposito'],
  [9,  'B. Hull'],
  [10, 'M. Lemieux'],
  [11, 'M. Bossy'],
  [16, 'B. Clarke'],
  [19, 'S. Yzerman'],
  [21, 'P. Forsberg'],
  [22, 'M. Naslund'],
  [24, 'T. Thomas'],
  [27, 'F. Nylander'],
  [33, 'G. Roberts'],
  [44, 'D. Hatcher'],
  [55, 'L. Karlsson'],
  [77, 'R. MacLean'],
]);

const AWAY_ROSTER = makeRoster([
  [30, 'M. Brodeur',   true],
  [2,  'A. Niedermayer'],
  [3,  'C. Pronger'],
  [8,  'M. Messier'],
  [13, 'M. Sundin'],
  [17, 'W. Gretzky'],
  [20, 'L. Lecavalier'],
  [25, 'J. Nieuwendyk'],
  [26, 'P. Kariya'],
  [29, 'K. Tkachuk'],
  [37, 'E. Lindros'],
  [40, 'H. Zetterberg'],
  [52, 'S. Gonchar'],
  [64, 'P. Hrkac'],
  [68, 'J. Jagr'],
  [91, 'S. Crosby'],
]);

export default async function PrintSheetDemoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Demo QR code points to the public scorekeeper page (no real token)
  const demoQrUrl = 'https://beerleaguehockey.ca/demo/scorekeeper?token=DEMO1234';

  return (
    <div className="min-h-screen bg-neutral-100 print:bg-white">
      {/* Non-print bar with demo notice */}
      <div className="no-print print:hidden flex items-center justify-between gap-4 px-4 py-3 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Preview
          </span>
          <span className="text-sm text-neutral-400">
            This is a demo game sheet with mock data — the real sheet is generated per-game with actual rosters and a live QR code.
          </span>
        </div>
        <PrintButton />
      </div>

      <PrintableGameSheet
        league={{ name: 'Beer League Hockey — Demo League' }}
        game={{
          scheduledAt: DEMO_GAME_SCHEDULED_AT,
          location: 'Barrie Community Arena — Rink 2',
          periodCount: 3,
          periodLengthMinutes: 20,
        }}
        season={{ name: '2025–26 Winter Season' }}
        homeTeam={{ name: 'Vipers', roster: HOME_ROSTER }}
        awayTeam={{ name: 'Grizzlies', roster: AWAY_ROSTER }}
        qrCodeUrl={demoQrUrl}
      />
    </div>
  );
}
