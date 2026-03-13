'use client';

import { useRef, useState } from 'react';
import { ScrollText, Save, Loader2, Info, Upload, FileText, ExternalLink, X } from 'lucide-react';
import { Button } from '@hockey-life/ui';
import { toast } from 'sonner';
import {
  deleteWaiverDocument,
  saveWaiverTemplate,
  uploadWaiverDocument,
} from '@/lib/actions/waiver-management';

interface WaiverSettingsFormProps {
  leagueId: string;
  initialData: {
    title: string;
    content: string;
    version: string;
    documentUrl: string | null;
    documentName: string | null;
    documentMimeType: string | null;
    updatedAt: string | null;
  } | null;
}

export function WaiverSettingsForm({ leagueId, initialData }: WaiverSettingsFormProps) {
  const [title, setTitle] = useState(initialData?.title || 'Liability Waiver');
  const [content, setContent] = useState(initialData?.content || '');
  const [saving, setSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [version, setVersion] = useState(initialData?.version || null);
  const [updatedAt, setUpdatedAt] = useState(initialData?.updatedAt || null);
  const [documentUrl, setDocumentUrl] = useState(initialData?.documentUrl || '');
  const [documentName, setDocumentName] = useState(initialData?.documentName || '');
  const [documentMimeType, setDocumentMimeType] = useState(initialData?.documentMimeType || '');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDocumentUpload = async (file: File) => {
    setUploadingDocument(true);

    try {
      const previousUrl = documentUrl;
      const result = await uploadWaiverDocument(leagueId, file);

      if (!result.success) {
        toast.error(result.error || 'Failed to upload waiver document.');
        return;
      }

      if (!result.data) {
        toast.error('Failed to upload waiver document.');
        return;
      }

      setDocumentUrl(result.data.url);
      setDocumentName(result.data.name);
      setDocumentMimeType(result.data.mimeType);
      toast.success('Waiver document uploaded.');

      if (previousUrl) {
        await deleteWaiverDocument(leagueId, previousUrl);
      }
    } catch {
      toast.error('An unexpected error occurred while uploading.');
    } finally {
      setUploadingDocument(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDocument = async () => {
    if (!documentUrl) {
      return;
    }

    const previousUrl = documentUrl;
    setDocumentUrl('');
    setDocumentName('');
    setDocumentMimeType('');

    const result = await deleteWaiverDocument(leagueId, previousUrl);
    if (!result.success) {
      setDocumentUrl(previousUrl);
      toast.error(result.error);
      return;
    }

    toast.success('Waiver document removed.');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a waiver title.');
      return;
    }
    if (!content.trim() && !documentUrl) {
      toast.error('Add waiver text or upload a waiver document.');
      return;
    }

    setSaving(true);
    try {
      const result = await saveWaiverTemplate(leagueId, {
        title: title.trim(),
        content: content.trim(),
        documentUrl: documentUrl || null,
        documentName: documentName || null,
        documentMimeType: documentMimeType || null,
      });
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

        <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Waiver Document Upload</h3>
              <p className="mt-1 text-xs text-neutral-400">
                Upload a PDF or image of the official waiver if you already have a formatted
                document. This can be used instead of typing the full waiver into the text box.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleDocumentUpload(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingDocument}
                onClick={() => fileInputRef.current?.click()}
                className="border-white/10 bg-neutral-800 text-white hover:bg-neutral-700"
              >
                {uploadingDocument ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload PDF or Image
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-rink-500/20 bg-rink-500/10 px-3 py-2 text-xs text-rink-100">
            Owners can use either option:
            {' '}
            upload the official waiver PDF/image, type the waiver text, or use both together.
            If a document is uploaded, the text section below becomes optional.
          </div>

          {documentUrl ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rink-500/10 p-2 text-rink-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{documentName || 'Uploaded waiver document'}</p>
                    <p className="text-xs text-neutral-400">
                      {documentMimeType || 'Document'} · Players can open this before signing
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleRemoveDocument()}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/20"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-white/10 bg-black/10 p-4 text-sm text-neutral-500">
              No waiver document uploaded yet.
            </div>
          )}
        </div>

        {/* Content */}
        <div>
          <label htmlFor="waiver-content" className="block text-sm font-medium text-neutral-300 mb-1.5">
            {documentUrl ? 'Waiver Summary / Optional Text' : 'Waiver Content'}
          </label>
          <textarea
            id="waiver-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              documentUrl
                ? 'Optional: add a short summary or key notes players should see alongside the uploaded waiver.'
                : 'Enter your waiver text here, or upload a PDF/image above instead.'
            }
            rows={16}
            className="w-full px-3 py-2 rounded-lg border border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-rink-500 focus:border-transparent font-mono text-sm leading-relaxed resize-y"
          />
          <div className="flex items-start gap-2 mt-2 text-xs text-neutral-500">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {documentUrl
                ? 'This text is optional when a waiver document is uploaded. If left blank, players will still review and accept the uploaded file.'
                : 'Supports basic formatting: '}
              {!documentUrl && (
                <>
                  <code className="text-neutral-400"># Heading</code>,{' '}
                  <code className="text-neutral-400">## Subheading</code>,{' '}
                  <code className="text-neutral-400">- Bullet point</code>,{' '}
                  <code className="text-neutral-400">**bold text**</code>
                </>
              )}
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
