// Vérification de la signature d'un webhook Stripe (HMAC-SHA256), sans dépendance.
// Fonction pure (Web Crypto) : testée dans tests/stripe-signature.test.ts.

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparaison à temps constant. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signPayload(payload: string, timestamp: number, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
}

/**
 * @param header  en-tête « Stripe-Signature » : t=<horodatage>,v1=<signature>[,v1=…]
 * @param toleranceSeconds  écart maximal accepté (protection contre le rejeu)
 */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSeconds = 300, nowSeconds = Date.now() / 1000): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.trim().split('='));
  const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v ?? '');
  if (!Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
  const expected = await signPayload(payload, timestamp, secret);
  return signatures.some((s) => safeEqual(s, expected));
}
