'use client';

import { ExternalLink, FileText } from 'lucide-react';

interface WaiverDocumentPanelProps {
  documentUrl?: string | null;
  documentName?: string | null;
  documentMimeType?: string | null;
}

function isPreviewableImage(mimeType?: string | null, documentUrl?: string | null) {
  if (mimeType?.startsWith('image/')) {
    return true;
  }

  return !!documentUrl && /\.(png|jpe?g|webp)$/i.test(documentUrl);
}

function isPreviewablePdf(mimeType?: string | null, documentUrl?: string | null) {
  if (mimeType === 'application/pdf') {
    return true;
  }

  return !!documentUrl && /\.pdf($|\?)/i.test(documentUrl);
}

export function WaiverDocumentPanel({
  documentUrl,
  documentName,
  documentMimeType,
}: WaiverDocumentPanelProps) {
  if (!documentUrl) {
    return null;
  }

  const previewImage = isPreviewableImage(documentMimeType, documentUrl);
  const previewPdf = isPreviewablePdf(documentMimeType, documentUrl);

  return (
    <div className="glass-card rounded-[24px] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-[var(--league-primary)]/10 p-2">
            <FileText className="h-4 w-4 text-[var(--league-primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {documentName || 'Uploaded waiver document'}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Review the uploaded file before agreeing to the waiver.
            </p>
          </div>
        </div>

        <a
          href={documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--glass-card-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <ExternalLink className="h-4 w-4" />
          Open document
        </a>
      </div>

      {previewPdf ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
          <iframe
            src={documentUrl}
            title={documentName || 'Waiver document'}
            className="h-[480px] w-full"
          />
        </div>
      ) : null}

      {previewImage ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white p-2">
          <img
            src={documentUrl}
            alt={documentName || 'Waiver document'}
            className="max-h-[480px] w-full rounded object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
