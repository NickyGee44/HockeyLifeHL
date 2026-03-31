function uniqueIds(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function resolveSeasonParticipationTeamIds(params: {
  seasonPreferenceTeamIds: Array<string | null | undefined>;
  rosterTeamIds: Array<string | null | undefined>;
  registrationTeamIds: Array<string | null | undefined>;
  gameTeamIds: Array<string | null | undefined>;
}): string[] {
  const hardParticipationIds = uniqueIds([
    ...params.rosterTeamIds,
    ...params.registrationTeamIds,
    ...params.gameTeamIds,
  ]);

  if (hardParticipationIds.length > 0) {
    return hardParticipationIds;
  }

  return uniqueIds(params.seasonPreferenceTeamIds);
}
