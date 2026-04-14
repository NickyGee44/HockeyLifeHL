export async function shareCaptainPlayerInvite(options: {
  title: string;
  text: string;
  url: string;
  phone?: string | null;
}) {
  const message = `${options.text}`.trim();

  if (navigator.share) {
    await navigator.share({
      title: options.title,
      text: message,
      url: options.url,
    });
    return 'shared';
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
  }

  return 'copied';
}

export function buildSmsShareUrl(phone: string | null | undefined, message: string) {
  const target = phone || '';
  return `sms:${target}?&body=${encodeURIComponent(message)}`;
}

export function buildWhatsAppShareUrl(phone: string | null | undefined, message: string) {
  const digits = (phone || '').replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
