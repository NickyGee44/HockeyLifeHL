export type Confidence = 'high' | 'medium' | 'low';

export interface OcrGoal {
  period: number;
  timeMinutes: number;
  timeSeconds: number;
  teamType: 'home' | 'away';
  scorerJersey: number;
  assist1Jersey: number | null;
  assist2Jersey: number | null;
  confidence?: Confidence;
}

export interface OcrPenalty {
  period: number;
  timeMinutes: number;
  timeSeconds: number;
  teamType: 'home' | 'away';
  playerJersey: number;
  type: string;
  minutes: number;
  confidence?: Confidence;
}

export type OcrEvent =
  | { kind: 'goal'; data: OcrGoal; id: string }
  | { kind: 'penalty'; data: OcrPenalty; id: string };

function isTeamType(value: unknown): value is 'home' | 'away' {
  return value === 'home' || value === 'away';
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeGoal(goal: unknown): OcrGoal | null {
  const g = goal as Partial<OcrGoal>;
  if (!isTeamType(g.teamType)) return null;
  if (!Number.isFinite(Number(g.scorerJersey))) return null;

  return {
    period: Math.max(1, toNumber(g.period, 1)),
    timeMinutes: Math.max(0, toNumber(g.timeMinutes, 0)),
    timeSeconds: Math.max(0, toNumber(g.timeSeconds, 0)),
    teamType: g.teamType,
    scorerJersey: toNumber(g.scorerJersey, 0),
    assist1Jersey: g.assist1Jersey == null ? null : toNumber(g.assist1Jersey, 0),
    assist2Jersey: g.assist2Jersey == null ? null : toNumber(g.assist2Jersey, 0),
    confidence: g.confidence,
  };
}

function normalizePenalty(penalty: unknown): OcrPenalty | null {
  const p = penalty as Partial<OcrPenalty>;
  if (!isTeamType(p.teamType)) return null;
  if (!Number.isFinite(Number(p.playerJersey))) return null;
  if (typeof p.type !== 'string' || p.type.trim().length === 0) return null;

  return {
    period: Math.max(1, toNumber(p.period, 1)),
    timeMinutes: Math.max(0, toNumber(p.timeMinutes, 0)),
    timeSeconds: Math.max(0, toNumber(p.timeSeconds, 0)),
    teamType: p.teamType,
    playerJersey: toNumber(p.playerJersey, 0),
    type: p.type.trim(),
    minutes: Math.max(0, toNumber(p.minutes, 2)),
    confidence: p.confidence,
  };
}

export function parseOcrAnalysisResult(payload: unknown): OcrEvent[] {
  const source = (payload ?? {}) as {
    goals?: unknown[];
    penalties?: unknown[];
  };

  const goals = Array.isArray(source.goals) ? source.goals : [];
  const penalties = Array.isArray(source.penalties) ? source.penalties : [];

  const events: OcrEvent[] = [];
  let index = 0;

  for (const goal of goals) {
    const normalized = normalizeGoal(goal);
    if (normalized) {
      events.push({ kind: 'goal', data: normalized, id: `evt-${index++}` });
    }
  }

  for (const penalty of penalties) {
    const normalized = normalizePenalty(penalty);
    if (normalized) {
      events.push({ kind: 'penalty', data: normalized, id: `evt-${index++}` });
    }
  }

  events.sort((a, b) => {
    const aData = a.data;
    const bData = b.data;
    if (aData.period !== bData.period) return aData.period - bData.period;
    return aData.timeMinutes * 60 + aData.timeSeconds - (bData.timeMinutes * 60 + bData.timeSeconds);
  });

  return events;
}

