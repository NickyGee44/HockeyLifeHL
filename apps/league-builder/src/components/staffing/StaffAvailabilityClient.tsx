'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  saveMyRefereeAvailability,
  saveMyScorekeeperAvailability,
  type AvailabilityWindowInput,
  type StaffAvailabilityRole,
} from '@/lib/actions/staffing-availability';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarClock, Plus, Save, Trash2 } from 'lucide-react';

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

const TYPE_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'preferred', label: 'Preferred' },
  { value: 'unavailable', label: 'Unavailable' },
] as const;

function createEmptyWindow(dayOfWeek: number = 0): AvailabilityWindowInput {
  return {
    dayOfWeek,
    startTime: '18:00',
    endTime: '23:00',
    availabilityType: 'available',
  };
}

export function StaffAvailabilityClient({ roles }: { roles: StaffAvailabilityRole[] }) {
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, AvailabilityWindowInput[]>>(() =>
    Object.fromEntries(
      roles.map((role) => [
        role.recordId,
        role.windows.length > 0 ? role.windows : [createEmptyWindow()],
      ])
    )
  );

  const groupedRoles = useMemo(() => {
    return roles.reduce<Record<string, StaffAvailabilityRole[]>>((accumulator, role) => {
      const key = role.leagueName;
      const existing = accumulator[key] || [];
      existing.push(role);
      accumulator[key] = existing;
      return accumulator;
    }, {});
  }, [roles]);

  const updateWindow = (
    recordId: string,
    index: number,
    field: keyof AvailabilityWindowInput,
    value: string | number
  ) => {
    setDrafts((previous) => {
      const next = [...(previous[recordId] || [])];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return { ...previous, [recordId]: next };
    });
  };

  const addWindow = (recordId: string) => {
    setDrafts((previous) => ({
      ...previous,
      [recordId]: [...(previous[recordId] || []), createEmptyWindow()],
    }));
  };

  const removeWindow = (recordId: string, index: number) => {
    setDrafts((previous) => {
      const next = [...(previous[recordId] || [])];
      next.splice(index, 1);
      return { ...previous, [recordId]: next.length > 0 ? next : [createEmptyWindow()] };
    });
  };

  const handleSave = (role: StaffAvailabilityRole) => {
    const windows = (drafts[role.recordId] || [])
      .filter((window) => window.startTime && window.endTime)
      .map((window) => ({
        ...window,
        startTime: window.startTime.slice(0, 5),
        endTime: window.endTime.slice(0, 5),
      }));

    startTransition(async () => {
      const result = role.roleType === 'scorekeeper'
        ? await saveMyScorekeeperAvailability({
            leagueScorekeeperId: role.recordId,
            windows,
          })
        : await saveMyRefereeAvailability({
            leagueRefereeId: role.recordId,
            windows,
          });

      if (!result.success) {
        toast.error(result.error || 'Failed to save availability.');
        return;
      }

      toast.success('Availability updated.');
    });
  };

  if (roles.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <CalendarClock className="mx-auto mb-4 h-10 w-10 text-rink-500" />
        <h2 className="text-lg font-semibold text-white">No staffing roles linked to this account yet</h2>
        <p className="mt-2 text-sm text-neutral-400">
          If a league owner invited you by email, make sure you signed in with the same email address they used.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedRoles).map(([leagueName, leagueRoles]) => (
        <section key={leagueName} className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white">{leagueName}</h2>
            <p className="text-sm text-neutral-400">
              Set the recurring weekly time slots you can work. League owners can then auto-assign games from this schedule.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {leagueRoles.map((role) => (
              <div key={role.recordId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{role.roleType}</p>
                    <h3 className="text-lg font-semibold text-white">{role.displayName}</h3>
                    {role.email && <p className="text-sm text-neutral-400">{role.email}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addWindow(role.recordId)}
                    className="border-white/10 text-neutral-300 hover:bg-neutral-800"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add slot
                  </Button>
                </div>

                <div className="space-y-3">
                  {(drafts[role.recordId] || []).map((window, index) => (
                    <div key={`${role.recordId}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-neutral-500">Day</Label>
                          <Select
                            value={String(window.dayOfWeek)}
                            onValueChange={(value) => updateWindow(role.recordId, index, 'dayOfWeek', Number(value))}
                          >
                            <SelectTrigger className="border-white/10 bg-neutral-900 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-neutral-900 text-white">
                              {DAY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={String(option.value)} className="text-white">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-neutral-500">Start</Label>
                          <Input
                            type="time"
                            value={window.startTime}
                            onChange={(event) => updateWindow(role.recordId, index, 'startTime', event.target.value)}
                            className="border-white/10 bg-neutral-900 text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-neutral-500">End</Label>
                          <Input
                            type="time"
                            value={window.endTime}
                            onChange={(event) => updateWindow(role.recordId, index, 'endTime', event.target.value)}
                            className="border-white/10 bg-neutral-900 text-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-neutral-500">Priority</Label>
                          <Select
                            value={window.availabilityType}
                            onValueChange={(value: AvailabilityWindowInput['availabilityType']) =>
                              updateWindow(role.recordId, index, 'availabilityType', value)
                            }
                          >
                            <SelectTrigger className="border-white/10 bg-neutral-900 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-neutral-900 text-white">
                              {TYPE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value} className="text-white">
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeWindow(role.recordId, index)}
                            className="text-neutral-500 hover:bg-neutral-800 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={() => handleSave(role)}
                    disabled={isPending}
                    className="bg-gradient-to-r from-rink-500 to-arena-500 font-semibold text-black"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save availability
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

