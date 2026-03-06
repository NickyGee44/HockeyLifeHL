export function buildWebsiteEditorPreviewUrl(baseUrl: string, slug: string): string {
  try {
    const url = new URL(baseUrl);
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    if (isLocalhost) {
      return `${baseUrl.replace(/\/+$/, '')}/${slug}?preview=true`;
    }

    url.hostname = `${slug}.${url.hostname}`;
    url.pathname = '/';
    url.search = 'preview=true';
    return url.toString();
  } catch {
    return `${baseUrl.replace(/\/+$/, '')}/${slug}?preview=true`;
  }
}

export function getWebsiteEditorPreviewOrigin(previewUrl: string): string | null {
  try {
    return new URL(previewUrl).origin;
  } catch {
    return null;
  }
}
