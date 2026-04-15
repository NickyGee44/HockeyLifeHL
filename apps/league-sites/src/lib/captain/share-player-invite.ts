export async function shareCaptainPlayerInvite(options: {
  title: string;
  text: string;
  url: string;
  phone?: string | null;
}) {
  const message = buildInviteShareMessage(options.text, options.url);

  if (navigator.share) {
    await navigator.share({
      title: options.title,
      text: options.text,
      url: options.url,
    });
    return 'shared';
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
  }

  return 'copied';
}

export function buildInviteShareMessage(message: string, url: string) {
  return `${message.trim()}\n\n${url}`.trim();
}

export function buildSmsShareUrl(phone: string | null | undefined, message: string, url: string) {
  const target = phone || '';
  return `sms:${target}?&body=${encodeURIComponent(buildInviteShareMessage(message, url))}`;
}

export function buildWhatsAppShareUrl(phone: string | null | undefined, message: string, url: string) {
  const digits = (phone || '').replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(buildInviteShareMessage(message, url))}`;
}
