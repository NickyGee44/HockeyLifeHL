'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Game } from '@/lib/actions/games';
import type { GameEventForCorrection, RosterPlayer } from '@/lib/actions/stat-corrections';
import {
  getGameEventsForCorrection,
  deleteGameEvent,
  addGameEvent,
  recalculateGameStats,
} from '@/lib/actions/stat-corrections';
import {
  Loader2,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  ClipboardEdit,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface StatCorrectionModalProps {
  game: Game;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type EventTypeFilter = 'all' | 'goal' | 'penalty' | 'save';

export function StatCorrectionModal({
  game,
  open,
  onOpenChange,
  onSuccess,
}: StatCorrectionModalProps) {
  const t = useTranslations('statCorrection');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GameEventForCorrection[]>([]);
  const [rosters, setRosters] = useState<RosterPlayer[]>([]);
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [filterType, setFilterType] = useState<EventTypeFilter>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Add event form state
  const [newEventType, setNewEventType] = useState<'goal' | 'penalty' | 'save'>('goal');
  const [newTeamType, setNewTeamType] = useState<'home' | 'away'>('home');
  const [newPlayerId, setNewPlayerId] = useState('');
  const [newPeriod, setNewPeriod] = useState('1');
  const [newAssist1, setNewAssist1] = useState('');
  const [newAssist2, setNewAssist2] = useState('');
  const [newPenaltyType, setNewPenaltyType] = useState('minor');
  const [newPenaltyMinutes, setNewPenaltyMinutes] = useState('2');
  const [newIsPowerPlay, setNewIsPowerPlay] = useState(false);
  const [newIsShortHanded, setNewIsShortHanded] = useState(false);
  const [newIsEmptyNet, setNewIsEmptyNet] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const result = await getGameEventsForCorrection(game.id);
    if (result.success) {
      setEvents(result.data.events);
      setRosters(result.data.rosters);
      setHomeTeamId(result.data.homeTeamId);
      setAwayTeamId(result.data.awayTeamId);
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }, [game.id]);

  useEffect(() => {
    if (open) {
      loadEvents();
      setHasChanges(false);
    }
  }, [open, loadEvents]);

  const activeEvents = events.filter((e) => !e.deleted_at);
  const filteredEvents = (showDeleted ? events : activeEvents).filter(
    (e) => filterType === 'all' || e.event_type === filterType
  );

  const teamIdForType = newTeamType === 'home' ? homeTeamId : awayTeamId;
  const teamRoster = rosters.filter((r) => r.team_id === teamIdForType);

  const handleDeleteEvent = async (eventId: string) => {
    setActionLoading(eventId);
    const result = await deleteGameEvent(eventId, 'Admin stat correction');
    if (result.success) {
      toast.success(t('eventDeleted'));
      setHasChanges(true);
      await loadEvents();
    } else {
      toast.error(result.error);
    }
    setActionLoading(null);
  };

  const handleAddEvent = async () => {
    if (!newPlayerId) {
      toast.error(t('selectPlayer'));
      return;
    }

    setActionLoading('add');
    const result = await addGameEvent({
      gameId: game.id,
      eventType: newEventType,
      period: parseInt(newPeriod),
      teamId: teamIdForType,
      teamType: newTeamType,
      playerId: newPlayerId,
      assist1PlayerId: newEventType === 'goal' && newAssist1 ? newAssist1 : undefined,
      assist2PlayerId: newEventType === 'goal' && newAssist2 ? newAssist2 : undefined,
      penaltyType: newEventType === 'penalty' ? newPenaltyType : undefined,
      penaltyMinutes: newEventType === 'penalty' ? parseInt(newPenaltyMinutes) : undefined,
      isPowerPlay: newEventType === 'goal' ? newIsPowerPlay : undefined,
      isShortHanded: newEventType === 'goal' ? newIsShortHanded : undefined,
      isEmptyNet: newEventType === 'goal' ? newIsEmptyNet : undefined,
      reason: 'Admin stat correction',
    });

    if (result.success) {
      toast.success(t('eventAdded'));
      setHasChanges(true);
      setShowAddEvent(false);
      resetAddForm();
      await loadEvents();
    } else {
      toast.error(result.error);
    }
    setActionLoading(null);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    const result = await recalculateGameStats(game.id);
    if (result.success) {
      toast.success(
        t('recalculated', {
          home: result.data.homeScore,
          away: result.data.awayScore,
        })
      );
      setHasChanges(false);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
    setRecalculating(false);
  };

  const resetAddForm = () => {
    setNewPlayerId('');
    setNewAssist1('');
    setNewAssist2('');
    setNewPenaltyType('minor');
    setNewPenaltyMinutes('2');
    setNewIsPowerPlay(false);
    setNewIsShortHanded(false);
    setNewIsEmptyNet(false);
  };

  const formatEventLabel = (event: GameEventForCorrection) => {
    const parts: string[] = [];
    if (event.event_type === 'goal') {
      parts.push(`P${event.period}`);
      parts.push(`#${event.player_number ?? '?'} ${event.player_name}`);
      if (event.assist1_name) parts.push(`(A: ${event.assist1_name}`);
      if (event.assist2_name) parts.push(`, ${event.assist2_name})`);
      else if (event.assist1_name) parts.push(')');
      if (event.is_power_play) parts.push('[PP]');
      if (event.is_short_handed) parts.push('[SH]');
      if (event.is_empty_net) parts.push('[EN]');
    } else if (event.event_type === 'penalty') {
      parts.push(`P${event.period}`);
      parts.push(`#${event.player_number ?? '?'} ${event.player_name}`);
      parts.push(`- ${event.penalty_minutes}min ${event.penalty_type || ''}`);
    } else if (event.event_type === 'save') {
      parts.push(`P${event.period}`);
      parts.push(`#${event.player_number ?? '?'} ${event.player_name}`);
    }
    return parts.join(' ');
  };

  const eventTypeColor = (type: string) => {
    switch (type) {
      case 'goal':
        return 'text-green-400';
      case 'penalty':
        return 'text-red-400';
      case 'save':
        return 'text-blue-400';
      default:
        return 'text-neutral-400';
    }
  };

  const teamTypeLabel = (teamType: 'home' | 'away') => {
    if (teamType === 'home') return game.home_team?.short_name || game.home_team?.name || 'Home';
    return game.away_team?.short_name || game.away_team?.name || 'Away';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-neutral-800 border-white/10 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ClipboardEdit className="w-5 h-5 text-rink-500" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Teams Display */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 border border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md"
              style={{ backgroundColor: game.home_team?.primary_color || '#22D3EE' }}
            />
            <span className="font-medium text-white text-sm">
              {game.home_team?.name}
            </span>
          </div>
          <span className="text-neutral-500 font-medium text-sm">vs</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white text-sm">
              {game.away_team?.name}
            </span>
            <div
              className="w-6 h-6 rounded-md"
              style={{ backgroundColor: game.away_team?.primary_color || '#3B82F6' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-rink-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters & Actions Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as EventTypeFilter)}
              >
                <SelectTrigger className="w-[130px] bg-neutral-900 border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-white/10">
                  <SelectItem value="all">{t('filterAll')}</SelectItem>
                  <SelectItem value="goal">{t('filterGoals')}</SelectItem>
                  <SelectItem value="penalty">{t('filterPenalties')}</SelectItem>
                  <SelectItem value="save">{t('filterSaves')}</SelectItem>
                </SelectContent>
              </Select>

              <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="rounded border-white/20 bg-neutral-900"
                />
                {t('showDeleted')}
              </label>

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddEvent(!showAddEvent)}
                className="gap-1.5 border-green-500/30 text-green-400 hover:bg-green-500/10 text-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('addEvent')}
              </Button>
            </div>

            {/* Add Event Form */}
            {showAddEvent && (
              <div className="p-4 rounded-xl bg-neutral-900/80 border border-white/[0.08] space-y-3">
                <h4 className="text-sm font-medium text-white">{t('addNewEvent')}</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">{t('eventType')}</Label>
                    <Select value={newEventType} onValueChange={(v) => setNewEventType(v as 'goal' | 'penalty' | 'save')}>
                      <SelectTrigger className="bg-neutral-800 border-white/10 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-white/10">
                        <SelectItem value="goal">{t('goal')}</SelectItem>
                        <SelectItem value="penalty">{t('penalty')}</SelectItem>
                        <SelectItem value="save">{t('save')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">{t('team')}</Label>
                    <Select value={newTeamType} onValueChange={(v) => {
                      setNewTeamType(v as 'home' | 'away');
                      setNewPlayerId('');
                      setNewAssist1('');
                      setNewAssist2('');
                    }}>
                      <SelectTrigger className="bg-neutral-800 border-white/10 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-white/10">
                        <SelectItem value="home">{teamTypeLabel('home')}</SelectItem>
                        <SelectItem value="away">{teamTypeLabel('away')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">{t('player')}</Label>
                    <Select value={newPlayerId} onValueChange={setNewPlayerId}>
                      <SelectTrigger className="bg-neutral-800 border-white/10 text-white text-sm">
                        <SelectValue placeholder={t('selectPlayer')} />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-white/10 max-h-48">
                        {teamRoster
                          .sort((a, b) => a.jersey_number - b.jersey_number)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              #{p.jersey_number} {p.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-400">{t('period')}</Label>
                    <Select value={newPeriod} onValueChange={setNewPeriod}>
                      <SelectTrigger className="bg-neutral-800 border-white/10 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-800 border-white/10">
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">OT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Goal-specific fields */}
                {newEventType === 'goal' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400">{t('assist1')}</Label>
                        <Select value={newAssist1} onValueChange={setNewAssist1}>
                          <SelectTrigger className="bg-neutral-800 border-white/10 text-white text-sm">
                            <SelectValue placeholder={t('none')} />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-white/10 max-h-48">
                            <SelectItem value="none">{t('none')}</SelectItem>
                            {teamRoster
                              .filter((p) => p.id !== newPlayerId)
                              .sort((a, b) => a.jersey_number - b.jersey_number)
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  #{p.jersey_number} {p.full_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-neutral-400">{t('assist2')}</Label>
                        <Select value={newAssist2} onValueChange={setNewAssist2}>
                          <SelectTrigger className="bg-neutral-800 border-white/10 text-white text-sm">
                            <SelectValue placeholder={t('none')} />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-800 border-white/10 max-h-48">
                            <SelectItem value="none">{t('none')}</SelectItem>
                            {teamRoster
                              .filter((p) => p.id !== newPlayerId && p.id !== newAssist1)
                              .sort((a, b) => a.jersey_number - b.jersey_number)
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  #{p.jersey_number} {p.full_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIsPowerPlay}
                          onChange={(e) => {
                            setNewIsPowerPlay(e.target.checked);
                            if (e.target.checked) setNewIsShortHanded(false);
                          }}
                          className="rounded border-white/20 bg-neutral-900"
                        />
                        {t('powerPlay')}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIsShortHanded}
                          onChange={(e) => {
                            setNewIsShortHanded(e.target.checked);
                            if (e.target.checked) setNewIsPowerPlay(false);
                          }}
                          className="rounded border-white/20 bg-neutral-900"
                        />
                        {t('shortHanded')}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIsEmptyNet}
                          onChange={(e) => setNewIsEmptyNet(e.target.checked)}
                          className="rounded border-white/20 bg-neutral-900"
                        />
                        {t('emptyNet')}
                      </label>
                    </div>
                  </>
                )}

                {/* Penalty-specific fields */}
                {newEventType === 'penalty' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-400">{t('penaltyType')}</Label>
                      <Select value={newPenaltyType} onValueChange={setNewPenaltyType}>
                        <SelectTrigger className="bg-neutral-800 border-white/10 text-white text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-neutral-800 border-white/10">
                          <SelectItem value="minor">{t('minor')}</SelectItem>
                          <SelectItem value="major">{t('major')}</SelectItem>
                          <SelectItem value="misconduct">{t('misconduct')}</SelectItem>
                          <SelectItem value="game_misconduct">{t('gameMisconduct')}</SelectItem>
                          <SelectItem value="match">{t('match')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-neutral-400">{t('minutes')}</Label>
                      <Input
                        type="number"
                        min="0"
                        max="25"
                        value={newPenaltyMinutes}
                        onChange={(e) => setNewPenaltyMinutes(e.target.value)}
                        className="bg-neutral-800 border-white/10 text-white text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddEvent(false);
                      resetAddForm();
                    }}
                    className="border-neutral-600 text-neutral-300 hover:bg-neutral-700 text-sm"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddEvent}
                    disabled={actionLoading === 'add' || !newPlayerId}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    {actionLoading === 'add' && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    {t('addEvent')}
                  </Button>
                </div>
              </div>
            )}

            {/* Events List */}
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
              {filteredEvents.length === 0 ? (
                <p className="text-neutral-500 text-center py-6 text-sm">{t('noEvents')}</p>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      event.deleted_at
                        ? 'bg-red-500/5 border-red-500/10 opacity-50'
                        : 'bg-neutral-900/50 border-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    {/* Event type indicator */}
                    <span
                      className={`text-xs font-bold uppercase w-14 text-center ${eventTypeColor(
                        event.event_type
                      )}`}
                    >
                      {event.event_type}
                    </span>

                    {/* Team indicator */}
                    <div
                      className="w-2 h-8 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          event.team_type === 'home'
                            ? game.home_team?.primary_color || '#22D3EE'
                            : game.away_team?.primary_color || '#3B82F6',
                      }}
                    />

                    {/* Event details */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${event.deleted_at ? 'line-through text-neutral-500' : 'text-white'}`}>
                        {formatEventLabel(event)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {teamTypeLabel(event.team_type)}
                        {event.deleted_at && ` - ${t('deleted')}`}
                      </p>
                    </div>

                    {/* Delete button */}
                    {!event.deleted_at && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={actionLoading === event.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0 shrink-0"
                      >
                        {actionLoading === event.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Recalculate Warning */}
            {hasChanges && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                <p className="text-sm text-orange-300">{t('recalcWarning')}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-neutral-600 text-neutral-300 hover:bg-neutral-700"
          >
            {t('close')}
          </Button>
          <Button
            onClick={handleRecalculate}
            disabled={recalculating || loading}
            className="bg-gradient-to-r from-rink-500 to-arena-500 text-black hover:shadow-lg hover:shadow-rink-500/20 gap-2"
          >
            {recalculating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {t('recalculate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
