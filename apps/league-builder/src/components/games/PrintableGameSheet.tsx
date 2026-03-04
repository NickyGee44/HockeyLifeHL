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
  /** Full URL to encode in QR code — typically the scorekeeper token URL */
  qrCodeUrl?: string | null;
}

// ─── design tokens ───────────────────────────────────────────────────────────
const BORDER_HEAVY = '2pt solid #111';
const BORDER_LIGHT = '0.75pt solid #ccc';
const BORDER_MED   = '1pt solid #888';

const GOAL_ROWS    = 8;
const PENALTY_ROWS = 10;

// 14 standardised penalty codes — must match what the OCR prompt expects
const PENALTY_CODES = [
  ['1', 'Tripping'],    ['2', 'Hooking'],    ['3', 'Slashing'],
  ['4', 'Cross-chk'],  ['5', 'Roughing'],   ['6', 'Hi-sticking'],
  ['7', 'Holding'],    ['8', 'Interference'],['9', 'Boarding'],
  ['10','Delay/Game'], ['11','Too Many Men'],['12','Unsportsmanlike'],
  ['13','Fighting'],   ['14','Misconduct'],
];

// ─── tiny helpers ─────────────────────────────────────────────────────────────
function cell(w?: number | string, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: w,
    border: BORDER_LIGHT,
    padding: '1.5px 3px',
    verticalAlign: 'middle',
    textAlign: 'center',
    ...extra,
  };
}

function inputCell(w: number | string = 26): React.CSSProperties {
  return {
    width: w,
    height: 15,
    border: '1.5pt solid #333',
    display: 'inline-block',
    borderRadius: '2px',
    verticalAlign: 'middle',
  };
}

function sectionHeaderRow(label: string, colSpan: number) {
  return (
    <tr>
      <th
        colSpan={colSpan}
        style={{
          background: '#1a1a1a',
          color: '#fff',
          fontSize: '8pt',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          padding: '3px 6px',
          textAlign: 'left',
        }}
      >
        {label}
      </th>
    </tr>
  );
}

function colHead(label: string, w?: number | string, extra: React.CSSProperties = {}) {
  return (
    <th
      style={{
        background: '#e0e0e0',
        fontSize: '6.5pt',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '2px 3px',
        border: BORDER_MED,
        textAlign: 'center',
        width: w,
        ...extra,
      }}
    >
      {label}
    </th>
  );
}

function RosterColumn({ players }: { players: RosterPlayer[] }) {
  const sorted = [...players].sort(
    (a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999),
  );
  const half = Math.ceil(sorted.length / 2);
  const col1 = sorted.slice(0, half);
  const col2 = sorted.slice(half);
  const rows = Math.max(col1.length, col2.length, 3);

  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[col1, col2].map((col, ci) => (
        <table key={ci} style={{ flex: 1, borderCollapse: 'collapse', fontSize: '7pt' }}>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => {
              const p = col[i];
              return (
                <tr key={i} style={{ borderBottom: '0.5pt solid #ddd', height: '13px' }}>
                  <td style={{ width: 20, fontWeight: 700, paddingRight: 2, color: '#333', whiteSpace: 'nowrap' }}>
                    {p ? `#${p.jerseyNumber ?? '–'}` : ''}
                  </td>
                  <td style={{ color: '#222', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 72, paddingRight: 4 }}>
                    {p ? `${p.fullName}${p.isGoalie ? ' (G)' : ''}` : ''}
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

// ─── Main component ───────────────────────────────────────────────────────────
export function PrintableGameSheet({
  league,
  game,
  season,
  homeTeam,
  awayTeam,
  qrCodeUrl,
}: PrintableGameSheetProps) {
  const gameDate = game.scheduledAt
    ? format(new Date(game.scheduledAt), 'EEEE, MMMM d, yyyy · h:mm a')
    : 'Date TBD';

  const qrSrc = qrCodeUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=90x90&format=png&margin=4&data=${encodeURIComponent(qrCodeUrl)}`
    : null;

  return (
    <>
      <style>{`
        @page { size: letter portrait; margin: 0.35in; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: #fff; }
          .gs-root { box-shadow: none !important; }
        }
        .gs-root { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111; }
        .gs-root table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
        .gs-root td, .gs-root th { box-sizing: border-box; }
      `}</style>

      <div
        className="gs-root"
        style={{ background: '#fff', maxWidth: 780, margin: '0 auto', padding: 10 }}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <table style={{ marginBottom: 5, border: BORDER_HEAVY }}>
          <tbody>
            <tr>
              <td style={{ background: '#111', color: '#fff', padding: '5px 10px', width: '38%' }}>
                <div style={{ fontWeight: 900, fontSize: '11pt', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                  {league.name}
                </div>
                <div style={{ fontSize: '7pt', color: '#aaa', marginTop: 1 }}>{season.name}</div>
              </td>
              <td style={{ textAlign: 'center', padding: '5px 8px', background: '#f5f5f5' }}>
                <div style={{ fontSize: '7.5pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 1 }}>
                  Official Game Sheet
                </div>
                <div style={{ fontSize: '8pt', fontWeight: 600 }}>{gameDate}</div>
                {game.location && (
                  <div style={{ fontSize: '7.5pt', color: '#666', marginTop: 1 }}>{game.location}</div>
                )}
              </td>
              <td style={{ textAlign: 'right', padding: '5px 8px', width: '18%', background: '#f5f5f5', fontSize: '7pt', color: '#777', verticalAlign: 'top' }}>
                <div>{game.periodCount} periods × {game.periodLengthMinutes} min</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── MATCHUP ────────────────────────────────────────────────────── */}
        <table style={{ marginBottom: 5, border: BORDER_HEAVY }}>
          <tbody>
            <tr>
              <td style={{ width: '49%', padding: '4px 10px', background: '#f8f8f8', borderRight: BORDER_HEAVY }}>
                <div style={{ fontSize: '6.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>Home Team</div>
                <div style={{ fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{homeTeam.name}</div>
              </td>
              <td style={{ width: '2%', textAlign: 'center', fontSize: '9pt', fontWeight: 900, color: '#999' }}>vs</td>
              <td style={{ width: '49%', padding: '4px 10px', background: '#f8f8f8', textAlign: 'right' }}>
                <div style={{ fontSize: '6.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>Away Team</div>
                <div style={{ fontSize: '13pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{awayTeam.name}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── ROSTERS ────────────────────────────────────────────────────── */}
        <table style={{ marginBottom: 5, border: BORDER_HEAVY }}>
          <thead>
            {sectionHeaderRow('Rosters', 2)}
          </thead>
          <tbody>
            <tr>
              {/* Home roster header */}
              <th colSpan={1} style={{ width: '50%', fontSize: '7pt', fontWeight: 700, background: '#e8e8e8', padding: '2px 6px', borderRight: BORDER_HEAVY, textAlign: 'left', border: BORDER_MED }}>
                {homeTeam.name}
              </th>
              <th colSpan={1} style={{ width: '50%', fontSize: '7pt', fontWeight: 700, background: '#e8e8e8', padding: '2px 6px', textAlign: 'left', border: BORDER_MED }}>
                {awayTeam.name}
              </th>
            </tr>
            <tr>
              <td style={{ verticalAlign: 'top', padding: '3px 6px', borderRight: BORDER_HEAVY, width: '50%' }}>
                {homeTeam.roster.length > 0
                  ? <RosterColumn players={homeTeam.roster} />
                  : <span style={{ fontSize: '7.5pt', color: '#999', fontStyle: 'italic' }}>No roster on file</span>
                }
              </td>
              <td style={{ verticalAlign: 'top', padding: '3px 6px', width: '50%' }}>
                {awayTeam.roster.length > 0
                  ? <RosterColumn players={awayTeam.roster} />
                  : <span style={{ fontSize: '7.5pt', color: '#999', fontStyle: 'italic' }}>No roster on file</span>
                }
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── INSTRUCTIONS + PENALTY CODES + QR ──────────────────────────── */}
        <table style={{ marginBottom: 5, border: BORDER_HEAVY }}>
          <tbody>
            <tr>
              {/* Instructions */}
              <td style={{ verticalAlign: 'top', padding: '5px 8px', borderRight: BORDER_HEAVY, width: qrSrc ? '55%' : '70%' }}>
                <div style={{ fontSize: '7pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3, color: '#222' }}>
                  How to Fill Out This Sheet
                </div>
                <div style={{ fontSize: '7pt', lineHeight: 1.55, color: '#333' }}>
                  <div><b>Time:</b> write MM:SS — e.g. <b>14:32</b> = 14 min 32 sec into the period</div>
                  <div><b>H/A:</b> write <b>H</b> for Home ({homeTeam.name}) or <b>A</b> for Away ({awayTeam.name})</div>
                  <div><b>Goals:</b> scorer jersey #, then up to two assist jersey numbers</div>
                  <div><b>Penalties → Code:</b> use the number from the legend (e.g. <b>1</b> = Tripping)</div>
                  <div><b>Penalties → Min:</b> write <b>2</b>, <b>5</b>, <b>10</b>, or <b>M</b> (match penalty)</div>
                  {qrSrc && (
                    <div style={{ marginTop: 3, padding: '2px 5px', background: '#fffbe6', border: '0.75pt solid #f0c040', borderRadius: 3, fontSize: '6.5pt' }}>
                      <b>→ Scan QR code</b> to open the scoring app for this game, then tap <i>Upload Sheet</i> to photo this sheet for auto-entry.
                    </div>
                  )}
                </div>
              </td>

              {/* Penalty codes legend */}
              <td style={{ verticalAlign: 'top', padding: '5px 8px', borderRight: qrSrc ? BORDER_HEAVY : undefined, width: qrSrc ? '30%' : '30%' }}>
                <div style={{ fontSize: '7pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3, color: '#222' }}>
                  Penalty Codes
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 6, rowGap: 0 }}>
                  {PENALTY_CODES.map(([code, name]) => (
                    <div key={code} style={{ fontSize: '6.5pt', lineHeight: 1.5, color: '#333' }}>
                      <b>{code}</b> {name}
                    </div>
                  ))}
                </div>
              </td>

              {/* QR Code */}
              {qrSrc && (
                <td style={{ verticalAlign: 'middle', textAlign: 'center', padding: '5px 8px', width: '15%' }}>
                  <div style={{ fontSize: '6.5pt', color: '#555', marginBottom: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Scan to Score
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrSrc}
                    alt="Scorekeeper QR Code"
                    width={90}
                    height={90}
                    style={{ display: 'block', margin: '0 auto', border: '1pt solid #ddd' }}
                  />
                  <div style={{ fontSize: '6pt', color: '#888', marginTop: 2 }}>Opens scoring app</div>
                </td>
              )}
            </tr>
          </tbody>
        </table>

        {/* ── GOALS TABLE ─────────────────────────────────────────────────── */}
        <table style={{ marginBottom: 5, border: BORDER_HEAVY }}>
          <thead>
            {sectionHeaderRow('Goals — enter one row per goal', 7)}
            <tr>
              {colHead('#', 18)}
              {colHead('Per', 24)}
              {colHead('Time MM:SS', 60)}
              {colHead('H / A', 30)}
              {colHead('Scorer #', 42)}
              {colHead('Assist 1 #', 44)}
              {colHead('Assist 2 #', 44)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: GOAL_ROWS }).map((_, i) => (
              <tr key={i} style={{ height: 17, background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                <td style={cell(18, { fontSize: '7.5pt', color: '#aaa' })}>{i + 1}</td>
                <td style={cell(24)}><div style={inputCell(20)} /></td>
                <td style={cell(60)}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <div style={inputCell(22)} />
                    <span style={{ fontSize: '9pt', fontWeight: 700, lineHeight: 1 }}>:</span>
                    <div style={inputCell(18)} />
                  </div>
                </td>
                <td style={cell(30)}><div style={inputCell(24)} /></td>
                <td style={cell(42)}><div style={inputCell(36)} /></td>
                <td style={cell(44)}><div style={inputCell(36)} /></td>
                <td style={cell(44)}><div style={inputCell(36)} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── PENALTIES TABLE ─────────────────────────────────────────────── */}
        <table style={{ marginBottom: 5, border: BORDER_HEAVY }}>
          <thead>
            {sectionHeaderRow('Penalties — enter one row per penalty', 7)}
            <tr>
              {colHead('#', 18)}
              {colHead('Per', 24)}
              {colHead('Time MM:SS', 60)}
              {colHead('H / A', 30)}
              {colHead('Player #', 42)}
              {colHead('Code (1–14)', 54)}
              {colHead('Min', 36)}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PENALTY_ROWS }).map((_, i) => (
              <tr key={i} style={{ height: 17, background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                <td style={cell(18, { fontSize: '7.5pt', color: '#aaa' })}>{i + 1}</td>
                <td style={cell(24)}><div style={inputCell(20)} /></td>
                <td style={cell(60)}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <div style={inputCell(22)} />
                    <span style={{ fontSize: '9pt', fontWeight: 700, lineHeight: 1 }}>:</span>
                    <div style={inputCell(18)} />
                  </div>
                </td>
                <td style={cell(30)}><div style={inputCell(24)} /></td>
                <td style={cell(42)}><div style={inputCell(36)} /></td>
                <td style={cell(54)}><div style={inputCell(40)} /></td>
                <td style={cell(36)}><div style={inputCell(28)} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── SHOTS ON GOAL ───────────────────────────────────────────────── */}
        <table style={{ marginBottom: 5, border: BORDER_HEAVY, width: '100%' }}>
          <thead>
            <tr>
              {colHead('Shots on Goal', '20%', { textAlign: 'left', background: '#1a1a1a', color: '#fff', fontSize: '7pt' })}
              {colHead('Period 1', '12%')}
              {colHead('Period 2', '12%')}
              {colHead('Period 3', '12%')}
              {Array.from({ length: Math.max(0, game.periodCount - 3) }, (_, i) => (
                colHead(i === 0 ? 'OT' : `OT${i + 1}`, '10%')
              ))}
              {colHead('TOTAL', '14%', { fontWeight: 900 })}
            </tr>
          </thead>
          <tbody>
            {[homeTeam.name, awayTeam.name].map((name) => (
              <tr key={name} style={{ height: 22 }}>
                <td style={cell('20%', { textAlign: 'left', fontWeight: 700, fontSize: '7.5pt', paddingLeft: 6 })}>
                  {name}
                </td>
                {Array.from({ length: game.periodCount }).map((_, i) => (
                  <td key={i} style={cell()}><div style={inputCell(32)} /></td>
                ))}
                {game.periodCount < 4 && (
                  Array.from({ length: 4 - game.periodCount }).map((_, i) => (
                    <td key={`ot-${i}`} style={cell()}><div style={{ ...inputCell(32), borderColor: '#ddd' }} /></td>
                  ))
                )}
                <td style={cell('14%')}><div style={inputCell(40)} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── FOOTER: SCORE + SIGNATURES ─────────────────────────────────── */}
        <table style={{ border: BORDER_HEAVY }}>
          <tbody>
            {/* Final score row */}
            <tr style={{ background: '#f5f5f5', borderBottom: BORDER_MED }}>
              <td colSpan={4} style={{ padding: '5px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: '8pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 10 }}>
                  Final Score
                </span>
                <span style={{ fontSize: '8pt', marginRight: 5 }}>{homeTeam.name}</span>
                <div style={{ ...inputCell(32), height: 22, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />
                <span style={{ fontSize: '13pt', fontWeight: 900, marginRight: 5 }}>—</span>
                <div style={{ ...inputCell(32), height: 22, display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />
                <span style={{ fontSize: '8pt', marginRight: 14 }}>{awayTeam.name}</span>
                <span style={{ fontSize: '7.5pt', color: '#555', marginRight: 6 }}>OT?</span>
                <div style={{ width: 14, height: 14, border: '1.5pt solid #333', display: 'inline-block', verticalAlign: 'middle', borderRadius: 2, marginRight: 12 }} />
                <span style={{ fontSize: '7.5pt', color: '#555', marginRight: 6 }}>SO?</span>
                <div style={{ width: 14, height: 14, border: '1.5pt solid #333', display: 'inline-block', verticalAlign: 'middle', borderRadius: 2 }} />
              </td>
            </tr>
            {/* Signature row */}
            <tr>
              {[
                ['Referee', true],
                ['Timekeeper / Linesman', true],
                ['Home Captain', true],
                ['Away Captain', false],
              ].map(([label, hasBorder]) => (
                <td
                  key={String(label)}
                  style={{ width: '25%', padding: '4px 8px', borderRight: hasBorder ? BORDER_MED : undefined, verticalAlign: 'bottom' }}
                >
                  <div style={{ fontSize: '6.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#555', marginBottom: 2 }}>
                    {String(label)}
                  </div>
                  <div style={{ borderBottom: '1pt solid #666', height: 18, marginBottom: 3 }} />
                  <div style={{ borderBottom: '1pt solid #aaa', height: 18 }} />
                  <div style={{ fontSize: '6pt', color: '#aaa', marginTop: 1 }}>Signature · Printed name</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
