// Partage & téléchargement : API natives du navigateur, gratuites.

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // repli pour les navigateurs sans API presse-papiers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function canShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export function canShareFiles(file: File): boolean {
  return canShare() && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/** Partage natif (SMS, WhatsApp, e-mail…). Renvoie false si annulé ou indisponible. */
export async function shareNative(data: ShareData): Promise<boolean> {
  if (!canShare()) return false;
  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function mailtoLink(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function smsLink(phone: string, body: string): string {
  return `sms:${phone.replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(body)}`;
}
