// Paiement de l'abonnement (Stripe), via les fonctions serveur supabase/functions/stripe-*.
//
// Le navigateur ne connaît aucune clé Stripe : il demande au serveur une adresse de paiement,
// puis y redirige l'utilisateur. L'abonnement n'est écrit en base que par le webhook Stripe.
import { APP_CONFIG } from '../../config/app';
import type { BillingInterval } from './plans';
import { CLOUD_ENABLED, supabase } from '../../services/cloud/client';

/** Activé seulement hors bêta, en mode cloud, quand VITE_STRIPE_ENABLED vaut « true ». */
export function billingEnabled(): boolean {
  return CLOUD_ENABLED && !APP_CONFIG.betaMode && import.meta.env?.VITE_STRIPE_ENABLED === 'true';
}

async function redirect(fn: 'stripe-checkout' | 'stripe-portal', body: Record<string, string>): Promise<void> {
  if (!supabase) throw new Error('Paiement indisponible.');
  const { data, error } = await supabase.functions.invoke(fn, { body });
  const url = (data as { url?: string } | null)?.url;
  // On ne suit qu'une adresse Stripe : jamais une URL arbitraire renvoyée par le réseau.
  if (error || !url || !/^https:\/\/(checkout|billing)\.stripe\.com\//.test(url)) {
    throw new Error('Le paiement n’a pas pu être ouvert. Seul un administrateur peut gérer l’abonnement ; réessayez dans un instant.');
  }
  window.location.assign(url);
}

export function startCheckout(plan: 'starter' | 'pro' | 'business', interval: BillingInterval = 'month'): Promise<void> {
  return redirect('stripe-checkout', { plan, interval });
}

export function openBillingPortal(): Promise<void> {
  return redirect('stripe-portal', {});
}
