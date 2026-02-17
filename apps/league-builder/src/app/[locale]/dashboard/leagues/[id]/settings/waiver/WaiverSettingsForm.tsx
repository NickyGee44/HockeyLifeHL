'use client';

import { useState } from 'react';
import { ScrollText, Save, Loader2, Info } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { toast } from 'sonner';
import { saveWaiverTemplate } from '@/lib/actions/waiver-management';

interface WaiverSettingsFormProps {
  leagueId: string;
  initialData: {
    title: string;
    content: string;
    version: string;
    updatedAt: string | null;
  } | null;
}

export function WaiverSettingsForm({ leagueId, initialData }: WaiverSettingsFormProps) {
  const [title, setTitle] = useState(initialData?.title || 'Liability Waiver');
  const [content, setContent] = useState(initialData?.content || '');
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(initialData?.version || null);
  const [updatedAt, setUpdatedAt] = useState(initialData?.updatedAt || null);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a waiver title.');
      return;
    }
    if (!content.trim()) {
      toast.error('Please enter waiver content.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveWaiverTemplate(leagueId, title.trim(), content.trim());
      if (result.success && result.data) {
        setVersion(result.data.version);
        setUpdatedAt(new Date().toISOString());
        toast.success('Waiver template saved successfully.');
      } else if (!result.success) {
        toast.error(result.error);
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-5 w-5 text-rink-500" />
          <h2 className="text-lg font-semibold text-white">Waiver Template</h2>
        </div>
        {version && (
          <div className="text-sm text-neutral-500">
            Version {version}
            {updatedAt && (
              <span className="ml-2">
                &middot; Last updated{' '}
                {new Date(updatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="waiver-title" className="block text-sm font-medium text-neutral-300 mb-1.5">
            Waiver Title
          </label>
          <input
            id="waiver-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Liability Waiver"
            className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div>
          <label htmlFor="waiver-content" className="block text-sm font-medium text-neutral-300 mb-1.5">
            Waiver Content
          </label>
          <textarea
            id="waiver-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your waiver text here..."
            rows={16}
            className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent font-mono text-sm leading-relaxed resize-y"
          />
          <div className="flex items-start gap-2 mt-2 text-xs text-neutral-500">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              Supports basic formatting: <code className="text-neutral-400"># Heading</code>,{' '}
              <code className="text-neutral-400">## Subheading</code>,{' '}
              <code className="text-neutral-400">- Bullet point</code>,{' '}
              <code className="text-neutral-400">**bold text**</code>
            </span>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-rink-500 to-arena-500 text-black font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Waiver
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
