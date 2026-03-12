export interface RefereePayrollConfig {
  game_fee_cents: number;
  solo_game_fee_cents: number;
  paired_game_fee_cents: number;
  linesman_fee_cents: number;
  single_game_fee_cents: number;
}

export interface RefereePayrollScenario {
  role: string;
  officialsOnGame: number;
  assignmentsThatDay: number;
}

export interface RefereePayrollResolution {
  amountCents: number;
  ruleApplied: 'standard' | 'solo' | 'paired' | 'linesman' | 'single_game';
}

function normalizeCents(value: number | null | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value as number)) : 0;
}

export function resolveRefereePayroll(
  config: RefereePayrollConfig,
  scenario: RefereePayrollScenario
): RefereePayrollResolution {
  const base = normalizeCents(config.game_fee_cents);
  const solo = normalizeCents(config.solo_game_fee_cents);
  const paired = normalizeCents(config.paired_game_fee_cents);
  const linesman = normalizeCents(config.linesman_fee_cents);
  const singleGame = normalizeCents(config.single_game_fee_cents);
  const normalizedRole = String(scenario.role || 'referee').toLowerCase();

  if (normalizedRole === 'linesman' && linesman > 0) {
    return { amountCents: linesman, ruleApplied: 'linesman' };
  }

  if (scenario.assignmentsThatDay <= 1 && singleGame > 0) {
    return { amountCents: singleGame, ruleApplied: 'single_game' };
  }

  if (scenario.officialsOnGame <= 1 && solo > 0) {
    return { amountCents: solo, ruleApplied: 'solo' };
  }

  if (scenario.officialsOnGame > 1 && paired > 0) {
    return { amountCents: paired, ruleApplied: 'paired' };
  }

  return { amountCents: base, ruleApplied: 'standard' };
}
