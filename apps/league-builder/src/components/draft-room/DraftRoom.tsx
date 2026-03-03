'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Users, MessageCircle, X, Monitor } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@hockey-life/ui/lib/utils';
import { getBestAutoPickPlayer } from '@/lib/draft/auto-pick';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';

import { PickClock } from './PickClock';
import { PlayerPool } from './PlayerPool';
import { DraftBoard } from './DraftBoard';
import { DraftHistory } from './DraftHistory';
import { ChatSidebar } from './ChatSidebar';
import { DraftControls } from './DraftControls';
import { TradePickerModal } from './TradePickerModal';
import { DraftCompleteModal } from './DraftCompleteModal';
import { DraftResultsExport } from './DraftResultsExport';
import { RosterConfirmation } from './RosterConfirmation';
import { ConnectionStatus, ConnectionStatusBadge } from './ConnectionStatus';
import { useDraftReliability } from './useDraftReliability';
import type {
  Draft,
  DraftPick,
  DraftPlayer,
  DraftTeam,
  DraftOrder,
  DraftMessage,
  DraftState,
  DraftRoomProps,
  RosterConfirmationType,
} from './types';

export function DraftRoom({
  draftId,
  userId,
  userTeamId,
  isAdmin = false,
  isCaptain = false,
}: DraftRoomProps) {
  const t = useTranslations('draft');
  const [supabase] = useState(() => createClient());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Draft state
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [teams, setTeams] = useState<DraftTeam[]>([]);
  const [draftOrder, setDraftOrder] = useState<DraftOrder[]>([]);
  const [messages, setMessages] = useState<DraftMessage[]>([]);

  // UI state
  const [selectedPlayer, setSelectedPlayer] = useState<DraftPlayer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [rosterConfirmations, setRosterConfirmations] = useState<RosterConfirmationType[]>([]);
  const [showPickConfirm, setShowPickConfirm] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

  // Responsive sidebar state
  const [showPlayerPool, setShowPlayerPool] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [dismissedMobileBanner, setDismissedMobileBanner] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Track viewport size for responsive behavior
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1280;
      setIsMobile(mobile);
      setIsTablet(tablet);
      // Auto-collapse sidebars on smaller screens
      if (mobile || tablet) {
        setShowPlayerPool(false);
        setShowChat(false);
      } else {
        setShowPlayerPool(true);
        setShowChat(true);
      }
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Computed properties
  const isMyPick = draft?.current_team_id === userTeamId;
  const canPick = isMyPick && draft?.status === 'active' && (isCaptain || isAdmin);
  const canChat = isCaptain || isAdmin;
  const isPaused = draft?.status === 'paused';
  const isComplete = draft?.status === 'complete';

  // Reliability hook for connection monitoring and state drift detection
  const {
    connectionState,
    setLocalStateVersion,
    isPollingFallback,
    lastSyncTime,
    forceSync,
    processedEventIds,
  } = useDraftReliability({
    supabase,
    draftId,
    onStateVersionMismatch: () => {
      fetchDraftData(); // Full refresh on drift
    },
    onConnectionChange: (state) => {
      if (state === 'connected') {
        // Sync on reconnect
        fetchDraftData();
      }
    },
  });

  // AbortController ref to cancel in-flight fetch requests on re-entry
  const fetchControllerRef = useRef<AbortController | null>(null);

  // Fetch initial data
  const fetchDraftData = useCallback(async () => {
    // Cancel any in-flight request
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch draft state
      const { data: stateData, error: stateError } = await supabase.rpc(
        'get_draft_state',
        { p_draft_id: draftId }
      );

      if (controller.signal.aborted) return;
      if (stateError) throw stateError;

      // Handle RPC response type
      const state = stateData as unknown as { error?: string; draft?: Draft } | null;
      if (state?.error) throw new Error(state.error);

      if (state?.draft) {
        setDraftState(state as unknown as DraftState);
        setDraft(state.draft);
      }

      // Fetch picks with player and team names (exclude undone picks)
      const { data: picksData, error: picksError } = await supabase
        .from('draft_picks')
        .select(`
          *,
          player:profiles!draft_picks_player_id_fkey(full_name),
          team:teams(name)
        `)
        .eq('draft_id', draftId)
        .is('undone_at', null)  // Only active picks
        .order('pick_number', { ascending: true });

      if (controller.signal.aborted) return;
      if (picksError) throw picksError;

      const mappedPicks: DraftPick[] = (picksData || []).map((p: any) => ({
        ...p,
        player_name: p.player?.full_name || 'Unknown',
        team_name: p.team?.name || 'Unknown Team',
      }));
      setPicks(mappedPicks);

      // Update local state version from draft
      if (state?.draft && 'state_version' in state.draft) {
        setLocalStateVersion((state.draft as any).state_version || 0);
      }

      // Fetch available players
      const playerLimit = 500;
      const { data: playersData, error: playersError } = await supabase.rpc(
        'get_available_players',
        { p_draft_id: draftId, p_limit: playerLimit }
      );

      if (controller.signal.aborted) return;
      if (playersError) throw playersError;
      const fetchedPlayers = (playersData as DraftPlayer[]) || [];
      setPlayers(fetchedPlayers);

      // Warn if the player pool hit the limit (some players may be hidden)
      if (fetchedPlayers.length >= playerLimit) {
        toast.warning(`Showing first ${playerLimit} players. Some players may not be visible.`);
      }

      // Fetch teams
      const leagueId = state?.draft?.league_id;
      if (leagueId) {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('league_id', leagueId);

        if (controller.signal.aborted) return;
        if (teamsError) throw teamsError;
        const mappedTeams: DraftTeam[] = (teamsData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          picks: [],
        }));
        setTeams(mappedTeams);
      }

      // Fetch draft order
      const { data: orderData, error: orderError } = await supabase
        .from('draft_order')
        .select('*, team:teams(name)')
        .eq('draft_id', draftId)
        .order('round', { ascending: true })
        .order('pick_position', { ascending: true });

      if (controller.signal.aborted) return;
      if (orderError) throw orderError;

      const mappedOrder: DraftOrder[] = (orderData || []).map((o: any) => ({
        ...o,
        team_name: o.team?.name || 'Unknown',
      }));
      setDraftOrder(mappedOrder);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('draft_messages')
        .select(`
          *,
          user:profiles!draft_messages_user_id_fkey(full_name),
          team:teams(name)
        `)
        .eq('draft_id', draftId)
        .order('created_at', { ascending: true });

      if (controller.signal.aborted) return;
      if (messagesError) throw messagesError;

      const mappedMessages: DraftMessage[] = (messagesData || []).map((m: any) => ({
        ...m,
        user_name: m.user?.full_name || 'Unknown',
        team_name: m.team?.name || null,
      }));
      setMessages(mappedMessages);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Error fetching draft data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load draft');
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [draftId, supabase, setLocalStateVersion]);

  // Initial data fetch
  useEffect(() => {
    fetchDraftData();
  }, [fetchDraftData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!draftId) return;

    // Subscribe to draft changes
    const draftChannel = supabase
      .channel(`draft:${draftId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drafts',
          filter: `id=eq.${draftId}`,
        },
        (payload) => {
          const newDraft = payload.new as Draft & { state_version?: number };

          // Update state version for drift detection
          if (newDraft.state_version) {
            setLocalStateVersion(newDraft.state_version);
          }

          setDraft(newDraft);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'draft_picks',
          filter: `draft_id=eq.${draftId}`,
        },
        async (payload) => {
          const pickId = payload.new.id;

          // Deduplicate events
          if (processedEventIds.current.has(pickId)) {
            return;
          }
          processedEventIds.current.add(pickId);

          try {
            // Fetch the full pick with relations
            const { data, error } = await supabase
              .from('draft_picks')
              .select(`
                *,
                player:profiles!draft_picks_player_id_fkey(full_name),
                team:teams(name)
              `)
              .eq('id', pickId)
              .is('undone_at', null)  // Only if not undone
              .single();

            if (error) {
              console.error('Error fetching pick:', error);
              // Trigger full refresh on error
              forceSync();
              return;
            }

            if (data) {
              const pick = data as any;
              const newPick: DraftPick = {
                ...pick,
                player_name: pick.player?.full_name || 'Unknown',
                team_name: pick.team?.name || 'Unknown Team',
              };

              // Check if pick already exists (race condition protection)
              setPicks((prev) => {
                if (prev.some((p) => p.id === pickId)) {
                  return prev; // Already have this pick
                }
                return [...prev, newPick];
              });

              // Remove player from available pool
              setPlayers((prev) =>
                prev.filter((p) => p.player_id !== pick.player_id)
              );
            }
          } catch (err) {
            console.error('Error processing pick event:', err);
            forceSync(); // Recover by syncing
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'draft_picks',
          filter: `draft_id=eq.${draftId}`,
        },
        async (payload) => {
          // Handle undo (pick marked with undone_at)
          const updatedPick = payload.new as any;
          if (updatedPick.undone_at) {
            // Remove from picks list
            setPicks((prev) => prev.filter((p) => p.id !== updatedPick.id));
            // Restore player to pool
            fetchDraftData(); // Full refresh to get player back in pool
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'draft_messages',
          filter: `draft_id=eq.${draftId}`,
        },
        async (payload) => {
          // Fetch the full message with relations
          const { data } = await supabase
            .from('draft_messages')
            .select(`
              *,
              user:profiles!draft_messages_user_id_fkey(full_name),
              team:teams(name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const msg = data as any;
            const newMessage: DraftMessage = {
              ...msg,
              user_name: msg.user?.full_name || 'Unknown',
              team_name: msg.team?.name || null,
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(draftChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- real-time subscription: fetchDraftData, forceSync, processedEventIds, and setLocalStateVersion are stable or handled via refs; re-subscribing on their changes would cause channel thrashing
  }, [draftId, supabase]);

  // Make a pick
  const handleMakePick = async () => {
    if (!selectedPlayer || !canPick || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: pickError } = await supabase.rpc('make_draft_pick', {
        p_draft_id: draftId,
        p_player_id: selectedPlayer.player_id,
        p_idempotency_key: crypto.randomUUID(),
      });

      if (pickError) throw pickError;

      const result = data as unknown as { success?: boolean; error?: string } | null;
      if (!result?.success) throw new Error(result?.error || 'Failed to make pick');

      setSelectedPlayer(null);
    } catch (err) {
      console.error('Error making pick:', err);
      setError(err instanceof Error ? err.message : 'Failed to make pick');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle timeout (auto-pick)
  const handleTimeout = useCallback(async () => {
    // Only the team whose turn it is should trigger auto-pick
    if (!isMyPick || !draft?.auto_pick_enabled) return;

    // Guard against concurrent auto-pick attempts
    if (isSubmitting) return;

    const bestPlayer = getBestAutoPickPlayer(players);
    if (!bestPlayer) {
      // No players left; refresh state
      fetchDraftData();
      return;
    }

    const currentTeamName =
      teams.find((tm) => tm.id === draft.current_team_id)?.name || 'Unknown Team';

    try {
      const { data, error: pickError } = await supabase.rpc('make_draft_pick', {
        p_draft_id: draftId,
        p_player_id: bestPlayer.player_id,
        p_idempotency_key: crypto.randomUUID(),
      });

      if (pickError) throw pickError;

      const result = data as unknown as { success?: boolean; error?: string } | null;
      if (!result?.success) throw new Error(result?.error || 'Auto-pick failed');

      toast.info(`Auto-picked ${bestPlayer.player_name} for ${currentTeamName}`);
    } catch (err) {
      console.error('Auto-pick error:', err);
      toast.error('Auto-pick failed. Refreshing draft state...');
      // Fallback: refresh full state so the draft doesn't stall
      fetchDraftData();
    }
  }, [isMyPick, draft?.auto_pick_enabled, draft?.current_team_id, players, teams, draftId, supabase, isSubmitting, fetchDraftData]);

  // Send chat message
  const handleSendMessage = async (message: string) => {
    if (!canChat || !draft?.league_id) return;

    try {
      const { error: msgError } = await supabase.from('draft_messages').insert({
        draft_id: draftId,
        league_id: draft.league_id,
        user_id: userId,
        team_id: userTeamId || null,
        message,
        message_type: 'chat',
      });

      if (msgError) throw msgError;
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Admin controls
  const handlePauseDraft = async () => {
    if (!isAdmin) return;

    const { error } = await supabase.rpc('pause_draft', { p_draft_id: draftId });
    if (error) console.error('Error pausing draft:', error);
  };

  const handleResumeDraft = async () => {
    if (!isAdmin) return;

    const { error } = await supabase.rpc('resume_draft', { p_draft_id: draftId });
    if (error) console.error('Error resuming draft:', error);
  };

  // Undo last pick (admin only)
  const handleUndoPick = async () => {
    if (!isAdmin || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Note: undo_last_pick RPC is defined in migrations but not in generated types yet
      const { data, error } = await (supabase.rpc as any)('undo_last_pick', { p_draft_id: draftId });

      if (error) throw error;

      const result = data as { success?: boolean; error?: string; restored_player?: string };
      if (!result?.success) throw new Error(result?.error || 'Failed to undo pick');

      // Refresh data to get updated state
      fetchDraftData();
    } catch (err) {
      console.error('Error undoing pick:', err);
      setError(err instanceof Error ? err.message : 'Failed to undo pick');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle trade complete
  const handleTradeComplete = () => {
    setShowTradeModal(false);
    fetchDraftData(); // Refresh to get updated draft order
  };

  // Check for draft completion and show modal
  useEffect(() => {
    if (draft?.status === 'complete' && !showCompleteModal) {
      // Small delay for dramatic effect
      const timer = setTimeout(() => setShowCompleteModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [draft?.status, showCompleteModal]);

  // Fetch roster confirmations for complete drafts
  useEffect(() => {
    if (draft?.status === 'complete') {
      const fetchConfirmations = async () => {
        // Note: draft_roster_confirmations table is defined in migrations but not in generated types yet
        const { data } = await (supabase.from as any)('draft_roster_confirmations')
          .select('*')
          .eq('draft_id', draftId);

        if (data) {
          setRosterConfirmations(data as RosterConfirmationType[]);
        }
      };
      fetchConfirmations();
    }
  }, [draft?.status, draftId, supabase]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-rink-500 border-t-transparent" />
          <p className="text-muted-foreground">{t('loadingDraftRoom')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !draft) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <p className="text-lg font-medium text-red-500">{error}</p>
          <button
            onClick={fetchDraftData}
            className="rounded-lg bg-rink-500 px-4 py-2 font-medium text-black hover:bg-rink-600"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Draft complete state
  if (isComplete) {
    const isMyTeamConfirmed = rosterConfirmations.some((c) => c.team_id === userTeamId);

    return (
      <div className="container mx-auto p-6">
        {/* Complete Modal */}
        {draft && (
          <DraftCompleteModal
            isOpen={showCompleteModal}
            draft={draft}
            picks={picks}
            teams={teams}
            onClose={() => setShowCompleteModal(false)}
          />
        )}

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-lg border-2 border-green-500 bg-green-500/10 p-4">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-semibold text-green-500">{t('draftComplete')}</p>
              <p className="text-sm text-muted-foreground">
                {t('allPicksMade', { count: picks.length })}
              </p>
            </div>
          </div>

          {/* Export buttons */}
          <DraftResultsExport draftId={draftId} picks={picks} teams={teams} supabase={supabase} />
        </div>

        {/* Roster Confirmation for team captain */}
        {isCaptain && userTeamId && draft?.require_roster_confirmation && (
          <div className="mb-6">
            <RosterConfirmation
              draftId={draftId}
              teamId={userTeamId}
              picks={picks}
              supabase={supabase}
              onConfirm={() => {
                const newConfirmation: RosterConfirmationType = {
                  id: crypto.randomUUID(),
                  draft_id: draftId,
                  team_id: userTeamId,
                  league_id: draft.league_id,
                  confirmed_by: userId,
                  confirmed_at: new Date().toISOString(),
                  notes: null,
                  has_issues: false,
                };
                setRosterConfirmations((prev) => [...prev, newConfirmation]);
              }}
              isConfirmed={isMyTeamConfirmed}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DraftBoard
              teams={teams}
              picks={picks}
              draftOrder={draftOrder}
              currentRound={draft?.current_round || 1}
              currentPick={draft?.current_pick || 1}
              currentTeamId={null}
              totalRounds={draft?.total_rounds || Math.ceil(picks.length / teams.length) || 10}
            />
          </div>
          <div>
            <DraftHistory picks={picks} maxDisplay={20} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Trade Modal */}
      {draft && (
        <TradePickerModal
          isOpen={showTradeModal}
          onClose={() => setShowTradeModal(false)}
          draftId={draftId}
          teams={teams}
          currentRound={draft.current_round}
          totalRounds={draft.total_rounds || 10}
          onTradeComplete={handleTradeComplete}
          supabase={supabase}
        />
      )}

      {/* Confirm Pick Dialog */}
      <AlertDialog open={showPickConfirm} onOpenChange={setShowPickConfirm}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmPick')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('confirmPickDescription', {
                player: selectedPlayer?.player_name || '',
                team: teams.find((tm) => tm.id === draft?.current_team_id)?.name || t('yourTeam'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 text-neutral-300 hover:bg-neutral-800"
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowPickConfirm(false);
                handleMakePick();
              }}
              disabled={isSubmitting}
              className="bg-rink-500 text-black font-semibold hover:bg-rink-600"
            >
              {isSubmitting ? t('picking') : t('confirmPick')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Undo Pick Confirmation Dialog */}
      <AlertDialog open={showUndoConfirm} onOpenChange={setShowUndoConfirm}>
        <AlertDialogContent className="bg-neutral-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('undoLastPick')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              {t('undoLastPickDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/10 text-neutral-300 hover:bg-neutral-800"
              disabled={isSubmitting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUndoConfirm(false);
                handleUndoPick();
              }}
              disabled={isSubmitting}
              className="bg-orange-500 text-white font-semibold hover:bg-orange-600"
            >
              {isSubmitting ? t('undoing') : t('undoPick')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <header className={cn(
        'flex items-center justify-between border-b bg-card px-4 py-3',
        isMobile ? 'flex-col gap-2' : 'px-6 py-4'
      )}>
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <h1 className={cn(
              'font-bold truncate',
              isMobile ? 'text-base' : 'text-xl'
            )}>{draft?.name || t('draftRoom')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('roundAndPick', { round: draft?.current_round || 1, pick: draft?.current_pick || 1 })}
              {draft?.draft_type === 'snake' && (
                <span className="ml-2 text-rink-500">{t('snakeDraftLabel')}</span>
              )}
            </p>
          </div>
          {/* Connection status badge */}
          <ConnectionStatusBadge state={connectionState} />
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {/* Error display */}
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-1 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Admin controls */}
          {draft && (
            <DraftControls
              draft={draft}
              isAdmin={isAdmin}
              onPause={handlePauseDraft}
              onResume={handleResumeDraft}
              onUndo={() => setShowUndoConfirm(true)}
              onOpenTrade={() => setShowTradeModal(true)}
              isSubmitting={isSubmitting}
            />
          )}

          {/* Pick status */}
          {isMyPick && !isPaused && (
            <div className={cn(
              'rounded-lg bg-rink-500/20 font-medium text-rink-500',
              isMobile ? 'px-3 py-1 text-sm' : 'px-4 py-2'
            )}>
              {t('yourPick')}
            </div>
          )}
        </div>
      </header>

      {/* Connection status banner (when disconnected) */}
      {(connectionState === 'disconnected' || isPollingFallback) && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-6 py-2">
          <ConnectionStatus
            state={connectionState}
            isPollingFallback={isPollingFallback}
            lastSyncTime={lastSyncTime}
            onForceSync={forceSync}
          />
        </div>
      )}

      {/* Mobile notice banner */}
      {isMobile && !dismissedMobileBanner && (
        <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2">
          <Monitor className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="flex-1 text-sm text-amber-500">
            {t('mobileNotice')}
          </p>
          <button
            onClick={() => setDismissedMobileBanner(true)}
            className="flex-shrink-0 rounded p-1 text-amber-500 hover:bg-amber-500/20"
            aria-label="Dismiss notice"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className={cn(
        'flex flex-1 overflow-hidden',
        isMobile && 'flex-col'
      )}>
        {/* Left sidebar - Player pool */}
        {showPlayerPool && (
          <div className={cn(
            'border-r overflow-hidden flex-shrink-0',
            isMobile
              ? 'w-full border-r-0 border-b max-h-[50vh]'
              : 'w-80'
          )}>
            <PlayerPool
              players={players}
              onSelectPlayer={(player) => {
                setSelectedPlayer(player);
                // On mobile/tablet, auto-collapse player pool after selection
                if (isMobile || isTablet) {
                  setShowPlayerPool(false);
                }
              }}
              selectedPlayerId={selectedPlayer?.player_id}
              canPick={canPick}
            />
          </div>
        )}

        {/* Center - Draft board and timer */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Sidebar toggle buttons (visible on tablet/mobile) */}
          {(isMobile || isTablet) && (
            <div className="flex items-center gap-2 border-b px-3 py-2 bg-muted/30">
              <button
                onClick={() => {
                  setShowPlayerPool(!showPlayerPool);
                  if (!showPlayerPool) setShowChat(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  showPlayerPool
                    ? 'bg-rink-500 text-black'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {showPlayerPool ? <X className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                {t('players')}
              </button>
              <button
                onClick={() => {
                  setShowChat(!showChat);
                  if (!showChat) setShowPlayerPool(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  showChat
                    ? 'bg-rink-500 text-black'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {showChat ? <X className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                {t('chat')}
                {messages.length > 0 && !showChat && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-rink-500/20 text-xs text-rink-500">
                    {messages.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Pick clock and selected player */}
          <div className={cn(
            'flex items-center justify-between border-b p-4',
            isMobile && 'flex-col gap-3'
          )}>
            <PickClock
              expiresAt={draft?.current_pick_expires_at || null}
              isPaused={isPaused}
              isMyPick={isMyPick}
              onTimeout={handleTimeout}
              pickTimeSeconds={draft?.pick_time_seconds ?? 90}
            />

            {/* Selected player confirmation */}
            <div className={cn(
              'flex flex-1 items-center justify-center gap-4',
              isMobile ? 'px-2 w-full' : 'px-8'
            )}>
              {selectedPlayer ? (
                <div className={cn(
                  'flex items-center gap-4',
                  isMobile && 'flex-col'
                )}>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t('selected')}</p>
                    <p className={cn(
                      'font-bold',
                      isMobile ? 'text-lg' : 'text-xl'
                    )}>{selectedPlayer.player_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('positionAndSkill', { position: selectedPlayer.player_position ?? '?', skill: selectedPlayer.skill_level ?? '?' })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (isMyPick) {
                        setShowPickConfirm(true);
                      } else {
                        handleMakePick();
                      }
                    }}
                    disabled={!canPick || isSubmitting}
                    className={cn(
                      'rounded-lg bg-rink-500 font-bold text-black',
                      'hover:bg-rink-600 disabled:cursor-not-allowed disabled:opacity-50',
                      isMobile ? 'px-6 py-2 text-base w-full' : 'px-8 py-3 text-lg'
                    )}
                  >
                    {isSubmitting ? t('picking') : t('confirmPick')}
                  </button>
                </div>
              ) : canPick ? (
                <p className="text-muted-foreground text-center">
                  {isMobile || isTablet
                    ? t('selectPlayerMobile')
                    : t('selectPlayerDesktop')}
                </p>
              ) : isMyPick ? (
                <p className="text-muted-foreground text-center">
                  {t('waitingForCaptain')}
                </p>
              ) : (
                <p className="text-muted-foreground text-center">
                  {t('waitingForTeam', { team: draftState?.current_pick?.team_name || 'team' })}
                </p>
              )}
            </div>

            {!isMobile && <DraftHistory picks={picks} maxDisplay={5} />}
          </div>

          {/* Draft board */}
          <div className="flex-1 overflow-auto p-4">
            <DraftBoard
              teams={teams}
              picks={picks}
              draftOrder={draftOrder}
              currentRound={draft?.current_round || 1}
              currentPick={draft?.current_pick || 1}
              currentTeamId={draft?.current_team_id || null}
              totalRounds={draft?.total_rounds || 10}
            />
          </div>
        </div>

        {/* Right sidebar - Chat */}
        {showChat && (
          <div className={cn(
            'border-l overflow-hidden flex-shrink-0',
            isMobile
              ? 'w-full border-l-0 border-t max-h-[50vh]'
              : 'w-80'
          )}>
            <ChatSidebar
              messages={messages}
              onSendMessage={handleSendMessage}
              currentUserId={userId}
              currentTeamName={teams.find((t) => t.id === userTeamId)?.name}
              canSend={canChat}
            />
          </div>
        )}
      </div>
    </div>
  );
}
