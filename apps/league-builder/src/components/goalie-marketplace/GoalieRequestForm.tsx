'use client';

import { useState } from 'react';
import type { GoalieSkillLevel } from '@/lib/actions/goalie-marketplace';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface GoalieRequestFormValue {
  skill_level_needed: GoalieSkillLevel;
  compensation: string;
  notes: string;
}

interface GoalieRequestFormProps {
  onChange: (value: GoalieRequestFormValue) => void;
}

export function GoalieRequestForm({ onChange }: GoalieRequestFormProps) {
  const [value, setValue] = useState<GoalieRequestFormValue>({
    skill_level_needed: 'intermediate',
    compensation: '',
    notes: '',
  });

  const update = (next: Partial<GoalieRequestFormValue>) => {
    const merged = { ...value, ...next };
    setValue(merged);
    onChange(merged);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Skill Needed</Label>
        <Select value={value.skill_level_needed} onValueChange={(v) => update({ skill_level_needed: v as GoalieSkillLevel })}>
          <SelectTrigger className="bg-neutral-800 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="goalie-comp">Compensation</Label>
        <Input id="goalie-comp" value={value.compensation} onChange={(e) => update({ compensation: e.target.value })} placeholder="Free, $20, drinks after..." className="bg-neutral-800 border-white/10" />
      </div>
      <div>
        <Label htmlFor="goalie-notes">Notes</Label>
        <Textarea id="goalie-notes" value={value.notes} onChange={(e) => update({ notes: e.target.value })} className="bg-neutral-800 border-white/10" placeholder="Any context for goalies" />
      </div>
    </div>
  );
}
