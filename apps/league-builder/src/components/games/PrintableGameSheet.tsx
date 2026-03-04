import { format } from 'date-fns';

export interface RosterPlayer {
  jerseyNumber: number | null;
  fullName: string;
  isGoalie: boolean;
}

export interface PrintableGameSheetProps {
  league: { name: string; logoUrl?: string | null };
  game: {
    scheduledAt: string | null;
    location: string | null;
    periodCount: number;
    periodLengthMinutes: number;
  };
  season: { name: string };
  homeTeam: { name: string; roster: RosterPlayer[] };
  awayTeam: { name: string; roster: RosterPlayer[] };
}

const GOAL_ROWS = 5;
const PENALTY_ROWS = 6;

const PENALTY_CODES = [
  '1=Trip', '2=Hook', '3=Slash', '4=X-Chk', '5=Rough', '6=Hi-Stk', '7=Hold',
  '8=Interf', '9=Board', '10=DG', '11=TMM', '12=UC', '13=Fight', '14=Misc',
];

function RosterColumn({ players }: { players: RosterPlayer[] }) {
  const sorted = [...players].sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999));
  // Split into two columns for compactness
  const half = Math.ceil(sorted.length / 2);
  const col1 = sorted.slice(0, half);
  const col2 = sorted.slice(half);
  const rows = Math.max(col1.length, col2.length);

  return (
    <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
      {[col1, col2].map((col, ci) => (
        <table key={ci} style={{ flex: 1, borderCollapse: 'collapse', fontSize: '7.5pt' }}>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => {
              const p = col[i];
              return (
                <tr key={i} style={{ borderBottom: '0.5pt solid #ccc' }}>
                  <td style={{ width: '20px', fontWeight: 700, paddingRight: '3px', color: '#333', whiteSpace: 'nowrap' }}>
                    {p ? `#${p.jerseyNumber ?? '?'}` : ''}
                  </td>
                  <td style={{ color: '#333', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>
                    {p ? (p.isGoalie ? `${p.fullName} (G)` : p.fullName) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function TimeBox() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      <div style={inputBox(22)} />
      <span style={{ fontSize: '9pt', fontWeight: 700, lineHeight: 1 }}>:</span>
      <div style={inputBox(16)} />
    </div>
  );
}

function JerseyBox(width = 22) {
  return <div style={inputBox(width)} />;
}

function inputBox(width: number, height = 18): React.CSSProperties {
  return {
    width,
    height,
    border: '1.5pt solid #111',
    borderRadius: '2px',
    display: 'inline-block',
    flexShrink: 0,
  };
}

function ColHeader({ labels }: { labels: string[] }) {
  return (
    <tr style={{ background: '#e8e8e8' }}>
      {labels.map((l, i) => (
        <td
          key={i}
          style={{
            fontSize: '6.5pt',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            padding: '1px 3px',
            color: '#444',
            borderRight: '0.5pt solid #bbb',
            textAlign: 'center',
          }}
        >
          {l}
        </td>
      ))}
    </tr>
  );
}

function GoalRows() {
  return (
    <>
      <ColHeader labels={['Time (MM:SS)', 'Scorer #', 'Assist 1 #', 'Assist 2 #']} />
      {Array.from({ length: GOAL_ROWS }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '0.5pt solid #ddd', height: '20px' }}>
          <td style={eventCell}>{TimeBox()}</td>
          <td style={eventCell}>{JerseyBox()}</td>
          <td style={eventCell}>{JerseyBox()}</td>
          <td style={eventCell}>{JerseyBox()}</td>
        </tr>
      ))}
    </>
  );
}

function PenaltyRows() {
  return (
    <>
      <ColHeader labels={['Time (MM:SS)', 'Player #', 'Code', 'Min']} />
      {Array.from({ length: PENALTY_ROWS }).map((_, i) => (
        <tr key={i} style={{ borderBottom: '0.5pt solid #ddd', height: '20px' }}>
          <td style={eventCell}>{TimeBox()}</td>
          <td style={eventCell}>{JerseyBox()}</td>
          <td style={eventCell}>{JerseyBox(18)}</td>
          <td style={eventCell}>{JerseyBox(16)}</td>
        </tr>
      ))}
    </>
  );
}

const eventCell: React.CSSProperties = {
  padding: '1px 3px',
  borderRight: '0.5pt solid #ddd',
  verticalAlign: 'middle',
};

const periodBanner: React.CSSProperties = {
  fontSize: '7.5pt',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  background: '#111',
  color: '#fff',
  padding: '2px 5px',
  textAlign: 'center',
};

const sectionHeader: React.CSSProperties = {
  fontSize: '9pt',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  background: '#333',
  color: '#fff',
  padding: '3px 6px',
  textAlign: 'center',
};

const halfTableStyle: React.CSSProperties = {
  flex: 1,
  borderCollapse: 'collapse',
  width: '100%',
  tableLayout: 'fixed',
};

function PeriodSection({
  label,
  type,
}: {
  label: string;
  type: 'goals' | 'penalties';
}) {
  return (
    <>
      {/* Period banner spanning both columns */}
      <tr>
        <td colSpan={2} style={periodBanner}>{label}</td>
      </tr>
      <tr>
        {/* Home half */}
        <td style={{ verticalAlign: 'top', borderRight: '2pt solid #333', padding: 0, width: '50%' }}>
          <table style={halfTableStyle}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '23%' }} />
            </colgroup>
            <tbody>{type === 'goals' ? <GoalRows /> : <PenaltyRows />}</tbody>
          </table>
        </td>
        {/* Away half */}
        <td style={{ verticalAlign: 'top', padding: 0, width: '50%' }}>
          <table style={halfTableStyle}>
            <colgroup>
              <col style={{ width: '30%' }} />
              <col style={{ width: '24%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '23%' }} />
            </colgroup>
            <tbody>{type === 'goals' ? <GoalRows /> : <PenaltyRows />}</tbody>
          </table>
        </td>
      </tr>
    </>
  );
}

export function PrintableGameSheet({
  league,
  game,
  season,
  homeTeam,
  awayTeam,
}: PrintableGameSheetProps) {
  const periodLabels = [
    'Period 1',
    'Period 2',
    'Period 3',
    ...(game.periodCount > 3
      ? Array.from({ length: game.periodCount - 3 }, (_, i) =>
          i === 0 ? 'Overtime' : `OT${i + 1}`
        )
      : ['Overtime']),
  ];

  const gameDate = game.scheduledAt
    ? format(new Date(game.scheduledAt), 'EEEE, MMMM d, yyyy')
    : 'Date TBD';
  const gameTime = game.scheduledAt
    ? format(new Date(game.scheduledAt), 'h:mm a')
    : '';

  return (
    <>
      <style>{`
        @page {
          size: letter portrait;
          margin: 0.35in;
        }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; }
          .sheet-root { box-shadow: none !important; padding: 0 !important; }
        }
        .sheet-root * { box-sizing: border-box; }
      `}</style>

      <div
        className="sheet-root"
        style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '9pt',
          color: '#111',
          background: '#fff',
          width: '100%',
          maxWidth: '780px',
          margin: '0 auto',
          padding: '12px',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            background: '#111',
            color: '#fff',
            padding: '8px 12px',
            marginBottom: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 900, fontSize: '11pt', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {league.name}
          </div>
          <div style={{ textAlign: 'center', fontSize: '8pt', color: '#ccc' }}>
            <div>{gameDate}{gameTime ? ` · ${gameTime}` : ''}</div>
            {game.location && <div>{game.location}</div>}
            <div style={{ fontSize: '7pt', marginTop: '1px' }}>{season.name}</div>
          </div>
          <div style={{ fontSize: '7pt', color: '#aaa', textAlign: 'right' }}>
            <div>{game.periodCount}×{game.periodLengthMinutes} min periods</div>
            <div style={{ marginTop: '2px', border: '1pt solid #555', padding: '1px 4px' }}>OFFICIAL GAME SHEET</div>
          </div>
        </div>

        {/* ── MATCHUP BAR ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', border: '1.5pt solid #111' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', textAlign: 'center', padding: '5px 8px', borderRight: '2pt solid #111', background: '#f5f5f5' }}>
                <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666', marginBottom: '1px' }}>HOME</div>
                <div style={{ fontSize: '12pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{homeTeam.name}</div>
              </td>
              <td style={{ width: '50%', textAlign: 'center', padding: '5px 8px', background: '#f5f5f5' }}>
                <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666', marginBottom: '1px' }}>AWAY</div>
                <div style={{ fontSize: '12pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{awayTeam.name}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── ROSTER + PENALTY CODE LEGEND ── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
          {/* Home roster */}
          <div style={{ flex: 1, border: '1pt solid #bbb', padding: '4px' }}>
            <div style={{ fontSize: '7pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666', marginBottom: '3px', borderBottom: '0.5pt solid #bbb', paddingBottom: '2px' }}>
              Home Roster
            </div>
            {homeTeam.roster.length > 0
              ? <RosterColumn players={homeTeam.roster} />
              : <div style={{ fontSize: '7.5pt', color: '#999', fontStyle: 'italic' }}>No roster on file</div>
            }
          </div>

          {/* Penalty code legend */}
          <div style={{ width: '120px', border: '1.5pt solid #111', padding: '4px', flexShrink: 0 }}>
            <div style={{ fontSize: '7pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px', borderBottom: '1pt solid #111', paddingBottom: '2px', textAlign: 'center' }}>
              Penalty Codes
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', fontSize: '7pt' }}>
              {PENALTY_CODES.map((c) => (
                <div key={c} style={{ padding: '0.5px 1px', color: '#222' }}>{c}</div>
              ))}
            </div>
          </div>

          {/* Away roster */}
          <div style={{ flex: 1, border: '1pt solid #bbb', padding: '4px' }}>
            <div style={{ fontSize: '7pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#666', marginBottom: '3px', borderBottom: '0.5pt solid #bbb', paddingBottom: '2px' }}>
              Away Roster
            </div>
            {awayTeam.roster.length > 0
              ? <RosterColumn players={awayTeam.roster} />
              : <div style={{ fontSize: '7.5pt', color: '#999', fontStyle: 'italic' }}>No roster on file</div>
            }
          </div>
        </div>

        {/* ── GOALS SECTION ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5pt solid #111', marginBottom: '5px' }}>
          <thead>
            <tr>
              <th colSpan={2} style={sectionHeader}>
                ⚽ Goals &nbsp;·&nbsp; Left column = HOME &nbsp;|&nbsp; Right column = AWAY
              </th>
            </tr>
          </thead>
          <tbody>
            {periodLabels.map((label) => (
              <PeriodSection key={label} label={label} type="goals" />
            ))}
          </tbody>
        </table>

        {/* ── PENALTIES SECTION ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5pt solid #111', marginBottom: '6px' }}>
          <thead>
            <tr>
              <th colSpan={2} style={sectionHeader}>
                🚨 Penalties &nbsp;·&nbsp; Code = number from legend &nbsp;·&nbsp; Min = 2 / 5 / 10 / M
              </th>
            </tr>
          </thead>
          <tbody>
            {periodLabels.map((label) => (
              <PeriodSection key={label} label={label} type="penalties" />
            ))}
          </tbody>
        </table>

        {/* ── FOOTER: SCORE + SIGNATURES ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5pt solid #111' }}>
          <tbody>
            {/* Final score */}
            <tr style={{ background: '#f5f5f5' }}>
              <td colSpan={4} style={{ textAlign: 'center', padding: '5px', borderBottom: '1pt solid #bbb' }}>
                <span style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: '8px' }}>Final Score</span>
                <span style={{ fontSize: '8pt', marginRight: '4px' }}>{homeTeam.name}</span>
                <div style={{ ...inputBox(30, 22), display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                <span style={{ fontSize: '11pt', fontWeight: 900, marginRight: '4px' }}>—</span>
                <div style={{ ...inputBox(30, 22), display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                <span style={{ fontSize: '8pt' }}>{awayTeam.name}</span>
              </td>
            </tr>
            {/* Signatures row */}
            <tr>
              <td style={{ width: '25%', padding: '4px 6px', borderRight: '1pt solid #ccc' }}>
                <div style={{ fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Referee</div>
                <div style={{ borderBottom: '1pt solid #999', height: '18px' }} />
                <div style={{ borderBottom: '1pt solid #999', height: '18px', marginTop: '4px' }} />
                <div style={{ fontSize: '6.5pt', color: '#999' }}>Signature / Printed name</div>
              </td>
              <td style={{ width: '25%', padding: '4px 6px', borderRight: '1pt solid #ccc' }}>
                <div style={{ fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Timekeeper / Linesman</div>
                <div style={{ borderBottom: '1pt solid #999', height: '18px' }} />
                <div style={{ borderBottom: '1pt solid #999', height: '18px', marginTop: '4px' }} />
                <div style={{ fontSize: '6.5pt', color: '#999' }}>Signature / Printed name</div>
              </td>
              <td style={{ width: '25%', padding: '4px 6px', borderRight: '1pt solid #ccc' }}>
                <div style={{ fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Home Captain</div>
                <div style={{ borderBottom: '1pt solid #999', height: '18px' }} />
                <div style={{ borderBottom: '1pt solid #999', height: '18px', marginTop: '4px' }} />
                <div style={{ fontSize: '6.5pt', color: '#999' }}>Signature / Printed name</div>
              </td>
              <td style={{ width: '25%', padding: '4px 6px' }}>
                <div style={{ fontSize: '7pt', color: '#666', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>Away Captain</div>
                <div style={{ borderBottom: '1pt solid #999', height: '18px' }} />
                <div style={{ borderBottom: '1pt solid #999', height: '18px', marginTop: '4px' }} />
                <div style={{ fontSize: '6.5pt', color: '#999' }}>Signature / Printed name</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
