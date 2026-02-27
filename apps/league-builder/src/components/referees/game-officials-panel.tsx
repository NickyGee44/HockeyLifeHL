'use client';

import { useState, useTransition, useEffect } from 'react';
import { cn } from '@hockey-life/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getGameOfficials,
  assignRefereeToGame,
  removeRefereeFromGame,
  type GameOfficial,
} from '@/lib/actions/referee-management';
import { Shield, UserPlus, Trash2, Loader2, User } from 'lucide-react';

interface GameOfficialsPanelProps {
  gameId: string;
  leagueId: string;
  /** Pre-populated list of referee names from league_staff for quick-pick */
  availableReferees?: Array<{ id: string; name: string }>;
}

export function GameOfficialsPanel({
  gameId,
  leagueId,
  availableReferees = [],
}: GameOfficialsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [officials, setOfficials] = useState<GameOfficial[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('referee');
  const [selectedPreset, setSelectedPreset] = useState('');

  // eslint-disable-next-line react-hooks/set-state-in-effect
  const loadOfficials = () => {
    startTransition(async () => {
      const result = await getGameOfficials(gameId);
      if (result.success && result.data) {
        setOfficials(result.data);
      }
    });
  };

  // Load officials on mount
  useEffect(() => {
    loadOfficials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const handleAdd = () => {
    const name = selectedPreset || newName.trim();
    if (!name) return;

    startTransition(async () => {
      const result = await assignRefereeToGame({
        gameId,
        leagueId,
        refereeName: name,
        role: newRole,
      });

      if (result.success) {
        loadOfficials();
        setNewName('');
        setSelectedPreset('');
        setShowAddForm(false);
      }
    });
  };

  const handleRemove = (officialId: string) => {
    startTransition(async () => {
      const result = await removeRefereeFromGame({
        officialId,
        leagueId,
      });

      if (result.success) {
        setOfficials((prev) => prev.filter((o) => o.id !== officialId));
      }
    });
  };

  const roleColors: Record<string, string> = {
    referee: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    linesman: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    timekeeper: 'bg-rink-500/10 text-rink-500 border-rink-500/30',
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-medium text-neutral-400">Game Officials</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-blue-500 hover:bg-blue-500/10 text-xs"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1" />
          Add Official
        </Button>
      </div>

      {/* Officials list */}
      {officials.length === 0 && !showAddForm ? (
        <p className="text-sm text-neutral-500 text-center py-4">No officials assigned yet</p>
      ) : (
        <div className="space-y-2 mb-3">
          {officials.map((official) => (
            <div
              key={official.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-neutral-800/50 border border-white/[0.06]"
            >
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-medium">{official.name}</span>
                {official.jersey_number && (
                  <span className="text-xs text-neutral-500 ml-2">#{official.jersey_number}</span>
                )}
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded border capitalize',
                  roleColors[official.role] || roleColors.referee
                )}
              >
                {official.role}
              </span>
              <button
                onClick={() => handleRemove(official.id)}
                disabled={isPending}
                className="p-1.5 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="p-3 rounded-lg bg-neutral-800/50 border border-white/[0.06] space-y-3 mt-3">
          {/* Quick-pick from league referees */}
          {availableReferees.length > 0 && (
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Quick Pick</label>
              <Select value={selectedPreset} onValueChange={(v) => { setSelectedPreset(v); setNewName(''); }}>
                <SelectTrigger className="bg-neutral-900 border-white/10 text-white text-sm">
                  <SelectValue placeholder="Select from league referees" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-white/10">
                  {availableReferees.map((ref) => (
                    <SelectItem key={ref.id} value={ref.name} className="text-white">
                      {ref.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="flex-1 border-t border-white/10" />
            or enter manually
            <div className="flex-1 border-t border-white/10" />
          </div>

          <Input
            placeholder="Official name"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setSelectedPreset(''); }}
            className="bg-neutral-900 border-white/10 text-white text-sm"
          />

          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="bg-neutral-900 border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-white/10">
              <SelectItem value="referee" className="text-white">Referee</SelectItem>
              <SelectItem value="linesman" className="text-white">Linesman</SelectItem>
              <SelectItem value="timekeeper" className="text-white">Timekeeper</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowAddForm(false); setNewName(''); setSelectedPreset(''); }}
              className="text-neutral-400 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isPending || (!newName.trim() && !selectedPreset)}
              className="bg-blue-500 text-white hover:bg-blue-600 text-xs"
            >
              {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
