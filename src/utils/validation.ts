import { parseDecimal } from './number';

export type Check = { ok: true; value: number } | { ok: false; error: string };

/** Nombre ≥ 0 (longueurs, quantités, prix). */
export function checkNonNegative(input: string | number | null | undefined, label = 'une valeur'): Check {
  const value = parseDecimal(input);
  if (value === null) return { ok: false, error: `Veuillez renseigner ${label} valide.` };
  if (value < 0) return { ok: false, error: 'La valeur ne peut pas être négative.' };
  return { ok: true, value };
}

/** Pourcentage entre 0 et 100. */
export function checkPercent(input: string | number | null | undefined, label = 'un pourcentage'): Check {
  const res = checkNonNegative(input, label);
  if (!res.ok) return res;
  if (res.value > 100) return { ok: false, error: 'Le pourcentage doit être compris entre 0 et 100.' };
  return res;
}

export function isValidEmail(email: string): boolean {
  return email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
