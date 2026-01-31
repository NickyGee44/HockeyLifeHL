'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Play, Pause, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@hockey-life/ui/lib/utils';

import { PickClock } from './PickClock';
import { PlayerPool } from './PlayerPool';
import { DraftBoard } from './DraftBoard';
import { DraftHistory } from './DraftHistory';
import { ChatSidebar } from './ChatSidebar';
import type {
  Draft,
  DraftPick,
  DraftPlayer,
  DraftTeam,
  DraftOrder,
  DraftMessage,
  DraftState,
  DraftRoomProps,
} from './types';

export function DraftRoom({
  draftId,
  userId,
  userTeamId,
  isAdmin = false,
  isCaptain = false,
}: DraftRoomProps) {
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

  // Computed properties
  const isMyPick = draft?.current_team_id === userTeamId;
  const canPick = isMyPick && draft?.status === 'active' && (isCaptain || isAdmin);
  const canChat = isCaptain || isAdmin;
  const isPaused = draft?.status === 'paused';
  const isComplete = draft?.status === 'complete';

  // Fetch initial data
  const fetchDraftData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch draft state
      const { data: stateData, error: stateError } = await supabase.rpc(
        'get_draft_state',
        { p_draft_id: draftId }
      );

      if (stateError) throw stateError;
      if (stateData?.error) throw new Error(stateData.error);

      setDraftState(stateData);
      setDraft(stateData.draft);

      // Fetch picks with player and team names
      const { data: picksData, error: picksError } = await supabase
        .from('draft_picks')
        .select(`
          *,
          player:profiles(first_name, last_name),
          team:teams(name)
        `)
        .eq('draft_id', draftId)
        .order('pick_number', { ascending: true });

      if (picksError) throw picksError;
      setPicks(
        picksData?.map((p) => ({
          ...p,
          player_name: p.player
            ? `${p.player.first_name} ${p.player.last_name}`
            : 'Unknown',
          team_name: p.team?.name || 'Unknown Team',
        })) || []
      );

      // Fetch available players
      const { data: playersData, error: playersError } = await supabase.rpc(
        'get_available_players',
        { p_draft_id: draftId, p_limit: 200 }
      );

      if (playersError) throw playersError;
      setPlayers(playersData || []);

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, logo, colors')
        .eq('league_id', stateData.draft.league_id);

      if (teamsError) throw teamsError;
      setTeams(teamsData?.map((t) => ({ ...t, picks: [] })) || []);

      // Fetch draft order
      const { data: orderData, error: orderError } = await supabase
        .from('draft_order')
        .select('*, team:teams(name)')
        .eq('draft_id', draftId)
        .order('round', { ascending: true })
        .order('pick_position', { ascending: true });

      if (orderError) throw orderError;
      setDraftOrder(
        orderData?.map((o) => ({
          ...o,
          team_name: o.team?.name || 'Unknown',
        })) || []
      );

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('draft_messages')
        .select(`
          *,
          user:profiles(first_name, last_name),
          team:teams(name)
        `)
        .eq('draft_id', draftId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(
        messagesData?.map((m) => ({
          ...m,
          user_name: m.user
            ? `${m.user.first_name} ${m.user.last_name}`
            : 'Unknown',
          team_name: m.team?.name || null,
        })) || []
      );
    } catch (err) {
      console.error('Error fetching draft data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load draft');
    } finally {
      setIsLoading(false);
    }
  }, [draftId, supabase]);

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
          console.log('Draft updated:', payload);
          setDraft(payload.new as Draft);
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
          console.log('New pick:', payload);
          // Fetch the full pick with relations
          const { data } = await supabase
            .from('draft_picks')
            .select(`
              *,
              player:profiles(first_name, last_name),
              team:teams(name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newPick = {
              ...data,
              player_name: data.player
                ? `${data.player.first_name} ${data.player.last_name}`
                : 'Unknown',
              team_name: data.team?.name || 'Unknown Team',
            };
            setPicks((prev) => [...prev, newPick]);

            // Remove player from available pool
            setPlayers((prev) =>
              prev.filter((p) => p.player_id !== data.player_id)
            );
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
          console.log('New message:', payload);
          // Fetch the full message with relations
          const { data } = await supabase
            .from('draft_messages')
            .select(`
              *,
              user:profiles(first_name, last_name),
              team:teams(name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newMessage = {
              ...data,
              user_name: data.user
                ? `${data.user.first_name} ${data.user.last_name}`
                : 'Unknown',
              team_name: data.team?.name || null,
            };
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(draftChannel);
    };
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
      });

      if (pickError) throw pickError;
      if (!data?.success) throw new Error(data?.error || 'Failed to make pick');

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
    if (!isMyPick || !draft?.auto_pick_enabled) return;

    console.log('Pick timed out, triggering auto-pick...');
    // Auto-pick will be handled by the server/cron job
    // Just refresh the state
    fetchDraftData();
  }, [isMyPick, draft?.auto_pick_enabled, fetchDraftData]);

  // Send chat message
  const handleSendMessage = async (message: string) => {
    if (!canChat) return;

    try {
      const { error: msgError } = await supabase.from('draft_messages').insert({
        draft_id: draftId,
        league_id: draft?.league_id,
        user_id: userId,
        team_id: userTeamId,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gold-500 border-t-transparent" />
          <p className="text-muted-foreground">Loading draft room...</p>
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
            className="rounded-lg bg-gold-500 px-4 py-2 font-medium text-black hover:bg-gold-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Draft complete state
  if (isComplete) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-3 rounded-lg border-2 border-green-500 bg-green-500/10 p-4">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <div>
            <p className="font-semibold text-green-500">Draft Complete!</p>
            <p className="text-sm text-muted-foreground">
              All {picks.length} picks have been made.
            </p>
          </div>
        </div>

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
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">{draft?.name || 'Draft Room'}</h1>
          <p className="text-sm text-muted-foreground">
            Round {draft?.current_round || 1} - Pick {draft?.current_pick || 1}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Error display */}
          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-1 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              {isPaused ? (
                <button
                  onClick={handleResumeDraft}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 font-medium text-white hover:bg-green-600"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={handlePauseDraft}
                  className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 font-medium text-black hover:bg-yellow-600"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              )}
            </div>
          )}

          {/* Pick status */}
          {isMyPick && !isPaused && (
            <div className="rounded-lg bg-gold-500/20 px-4 py-2 font-medium text-gold-500">
              Your Pick!
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Player pool */}
        <div className="w-80 flex-shrink-0 border-r overflow-hidden">
          <PlayerPool
            players={players}
            onSelectPlayer={setSelectedPlayer}
            selectedPlayerId={selectedPlayer?.player_id}
            canPick={canPick}
          />
        </div>

        {/* Center - Draft board and timer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Pick clock and selected player */}
          <div className="flex items-center justify-between border-b p-4">
            <PickClock
              expiresAt={draft?.current_pick_expires_at || null}
              isPaused={isPaused}
              isMyPick={isMyPick}
              onTimeout={handleTimeout}
            />

            {/* Selected player confirmation */}
            <div className="flex flex-1 items-center justify-center gap-4 px-8">
              {selectedPlayer ? (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Selected</p>
                    <p className="text-xl font-bold">{selectedPlayer.player_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPlayer.player_position} - Skill {selectedPlayer.skill_level}
                    </p>
                  </div>
                  <button
                    onClick={handleMakePick}
                    disabled={!canPick || isSubmitting}
                    className={cn(
                      'rounded-lg bg-gold-500 px-8 py-3 text-lg font-bold text-black',
                      'hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-50'
                    )}
                  >
                    {isSubmitting ? 'Picking...' : 'Confirm Pick'}
                  </button>
                </div>
              ) : canPick ? (
                <p className="text-muted-foreground">
                  Select a player from the pool to make your pick
                </p>
              ) : isMyPick ? (
                <p className="text-muted-foreground">
                  Waiting for captain to make the pick...
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Waiting for {draftState?.current_pick?.team_name || 'team'} to pick...
                </p>
              )}
            </div>

            <DraftHistory picks={picks} maxDisplay={5} />
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
        <div className="w-80 flex-shrink-0 border-l overflow-hidden">
          <ChatSidebar
            messages={messages}
            onSendMessage={handleSendMessage}
            currentUserId={userId}
            currentTeamName={teams.find((t) => t.id === userTeamId)?.name}
            canSend={canChat}
          />
        </div>
      </div>
    </div>
  );
}
