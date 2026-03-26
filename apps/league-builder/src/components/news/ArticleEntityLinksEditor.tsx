'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type {
  ArticleEditorSeasonOption,
  ArticleEntityGameOption,
  ArticleEntityPlayerOption,
  ArticleEntityTeamOption,
} from '@/lib/news/article-entity-types';

interface ArticleEntityLinksEditorProps {
  seasons: ArticleEditorSeasonOption[];
  seasonId: string | null;
  activeSeasonId: string | null;
  players: ArticleEntityPlayerOption[];
  teams: ArticleEntityTeamOption[];
  games: ArticleEntityGameOption[];
  linkedPlayerIds: string[];
  linkedTeamIds: string[];
  linkedGameIds: string[];
  primaryGameId: string | null;
  onSeasonChange: (seasonId: string | null) => void;
  onLinkedPlayerIdsChange: (ids: string[]) => void;
  onLinkedTeamIdsChange: (ids: string[]) => void;
  onLinkedGameIdsChange: (ids: string[]) => void;
  onPrimaryGameIdChange: (id: string | null) => void;
  onAutoSuggest: () => void;
  suggesting?: boolean;
  disabled?: boolean;
}

function formatGameLabel(game: ArticleEntityGameOption) {
  return `${game.awayTeamName} @ ${game.homeTeamName}`;
}

function formatGameMeta(game: ArticleEntityGameOption) {
  return [
    game.scheduledAt
      ? new Date(game.scheduledAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null,
    game.divisionName,
  ]
    .filter(Boolean)
    .join(' • ');
}

export function ArticleEntityLinksEditor({
  seasons,
  seasonId,
  activeSeasonId,
  players,
  teams,
  games,
  linkedPlayerIds,
  linkedTeamIds,
  linkedGameIds,
  primaryGameId,
  onSeasonChange,
  onLinkedPlayerIdsChange,
  onLinkedTeamIdsChange,
  onLinkedGameIdsChange,
  onPrimaryGameIdChange,
  onAutoSuggest,
  suggesting = false,
  disabled = false,
}: ArticleEntityLinksEditorProps) {
  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [gameSearch, setGameSearch] = useState('');

  const selectedPlayers = players.filter((player) => linkedPlayerIds.includes(player.id));
  const selectedTeams = teams.filter((team) => linkedTeamIds.includes(team.id));
  const selectedGames = games.filter((game) => linkedGameIds.includes(game.id));

  const filteredPlayers = players
    .filter((player) => !linkedPlayerIds.includes(player.id))
    .filter((player) => {
      const haystack = `${player.fullName} ${player.teamName || ''} ${player.divisionName || ''}`.toLowerCase();
      return haystack.includes(playerSearch.toLowerCase());
    })
    .slice(0, 8);

  const filteredTeams = teams
    .filter((team) => !linkedTeamIds.includes(team.id))
    .filter((team) => {
      const haystack = `${team.name} ${team.divisionName || ''}`.toLowerCase();
      return haystack.includes(teamSearch.toLowerCase());
    })
    .slice(0, 8);

  const filteredGames = games
    .filter((game) => !linkedGameIds.includes(game.id))
    .filter((game) => {
      const haystack = `${formatGameLabel(game)} ${game.divisionName || ''}`.toLowerCase();
      return haystack.includes(gameSearch.toLowerCase());
    })
    .slice(0, 8);

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">Linked Entities</h3>
          <p className="text-sm text-neutral-400">
            Control which players, teams, and games get linked on the public article page.
          </p>
        </div>
        <button
          type="button"
          onClick={onAutoSuggest}
          disabled={disabled || suggesting}
          className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-200 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {suggesting ? 'Detecting...' : 'Auto-Detect Links'}
        </button>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">Season Scope</label>
        <select
          value={seasonId || ''}
          onChange={(event) => onSeasonChange(event.target.value || null)}
          disabled={disabled}
          className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-rink-500/50"
        >
          <option value="">Use Active Season{activeSeasonId ? '' : ' / League-wide'}</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
              {season.status === 'active' ? ' (Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-300">Players</h4>
            <p className="mt-1 text-xs text-neutral-500">Tagged players get inline name links in the article body.</p>
          </div>
          <input
            value={playerSearch}
            onChange={(event) => setPlayerSearch(event.target.value)}
            placeholder="Search players"
            disabled={disabled}
            className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
          />
          <div className="flex flex-wrap gap-2">
            {selectedPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => onLinkedPlayerIdsChange(linkedPlayerIds.filter((id) => id !== player.id))}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-full border border-rink-500/30 bg-rink-500/10 px-3 py-1.5 text-xs font-medium text-rink-100"
              >
                <span>{player.fullName}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => onLinkedPlayerIdsChange([...linkedPlayerIds, player.id])}
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2 text-left transition-colors hover:border-rink-500/40"
              >
                <div className="text-sm font-medium text-white">{player.fullName}</div>
                <div className="text-xs text-neutral-500">
                  {[player.teamName, player.divisionName, player.jerseyNumber ? `#${player.jerseyNumber}` : null]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-300">Teams</h4>
            <p className="mt-1 text-xs text-neutral-500">Only explicitly linked teams will get body links.</p>
          </div>
          <input
            value={teamSearch}
            onChange={(event) => setTeamSearch(event.target.value)}
            placeholder="Search teams"
            disabled={disabled}
            className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
          />
          <div className="flex flex-wrap gap-2">
            {selectedTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => onLinkedTeamIdsChange(linkedTeamIds.filter((id) => id !== team.id))}
                disabled={disabled}
                className="inline-flex items-center gap-2 rounded-full border border-rink-500/30 bg-rink-500/10 px-3 py-1.5 text-xs font-medium text-rink-100"
              >
                <span>{team.name}</span>
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filteredTeams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => onLinkedTeamIdsChange([...linkedTeamIds, team.id])}
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2 text-left transition-colors hover:border-rink-500/40"
              >
                <div className="text-sm font-medium text-white">{team.name}</div>
                <div className="text-xs text-neutral-500">{team.divisionName || 'League team'}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-300">Games</h4>
            <p className="mt-1 text-xs text-neutral-500">Tagged matchups drive game links in the article body.</p>
          </div>
          <input
            value={gameSearch}
            onChange={(event) => setGameSearch(event.target.value)}
            placeholder="Search games"
            disabled={disabled}
            className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500/50"
          />
          <div className="space-y-2">
            {selectedGames.map((game) => (
              <div
                key={game.id}
                className="rounded-xl border border-rink-500/30 bg-rink-500/10 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{formatGameLabel(game)}</div>
                    <div className="text-xs text-neutral-400">{formatGameMeta(game)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextIds = linkedGameIds.filter((id) => id !== game.id);
                      onLinkedGameIdsChange(nextIds);
                      if (primaryGameId === game.id) {
                        onPrimaryGameIdChange(nextIds[0] || null);
                      }
                    }}
                    disabled={disabled}
                    className="rounded-full border border-white/10 p-1.5 text-neutral-300 transition-colors hover:border-red-400/40 hover:text-red-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-xs text-neutral-300">
                  <input
                    type="radio"
                    name="primary-article-game"
                    checked={primaryGameId === game.id}
                    onChange={() => onPrimaryGameIdChange(game.id)}
                    disabled={disabled}
                  />
                  Primary related game
                </label>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {filteredGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => {
                  const nextIds = [...linkedGameIds, game.id];
                  onLinkedGameIdsChange(nextIds);
                  if (!primaryGameId) {
                    onPrimaryGameIdChange(game.id);
                  }
                }}
                disabled={disabled}
                className="w-full rounded-xl border border-white/10 bg-neutral-900/80 px-3 py-2 text-left transition-colors hover:border-rink-500/40"
              >
                <div className="text-sm font-medium text-white">{formatGameLabel(game)}</div>
                <div className="text-xs text-neutral-500">{formatGameMeta(game)}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
