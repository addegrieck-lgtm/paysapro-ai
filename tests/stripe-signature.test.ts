import { describe, expect, it } from 'vitest';
import { signPayload, verifyStripeSignature } from '../supabase/functions/_shared/signature';

describe('Webhook Stripe — vérification de la signature', () => {
  const secret = 'whsec_test_secret';
  const payload = '{"id":"evt_1","type":"customer.subscription.updated"}';
  const now = 1_790_000_000;

  it('accepte un événement signé avec le bon secret', async () => {
    const header = `t=${now},v1=${await signPayload(payload, now, secret)}`;
    expect(await verifyStripeSignature(payload, header, secret, 300, now)).toBe(true);
    // Stripe peut envoyer plusieurs signatures (rotation du secret)
    expect(await verifyStripeSignature(payload, `t=${now},v1=${'0'.repeat(64)},v1=${await signPayload(payload, now, secret)}`, secret, 300, now)).toBe(true);
  });

  it('rejette un contenu modifié, un mauvais secret, un rejeu tardif ou un en-tête absent', async () => {
    const signature = await signPayload(payload, now, secret);
    const header = `t=${now},v1=${signature}`;
    expect(await verifyStripeSignature(payload.replace('evt_1', 'evt_2'), header, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, header, 'whsec_autre', 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, header, secret, 300, now + 301)).toBe(false);
    expect(await verifyStripeSignature(payload, `t=${now + 1},v1=${signature}`, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, null, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, 'v1=abc', secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(payload, header, '', 300, now)).toBe(false);
  });
});
