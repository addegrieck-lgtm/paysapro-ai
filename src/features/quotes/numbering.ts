// Numérotation des devis : « 2026-001 », remise à 1 chaque année.

export interface QuoteCounter {
  year: number;
  next: number;
}

export function formatQuoteNumber(year: number, sequence: number): string {
  return `${year}-${String(Math.max(1, Math.floor(sequence))).padStart(3, '0')}`;
}

/** Attribue le prochain numéro et renvoie le compteur mis à jour. */
export function nextQuoteNumber(counter: QuoteCounter, now = new Date()): { number: string; counter: QuoteCounter } {
  const year = now.getFullYear();
  const seq = counter.year === year && counter.next >= 1 ? Math.floor(counter.next) : 1;
  return { number: formatQuoteNumber(year, seq), counter: { year, next: seq + 1 } };
}

/** « DEVIS-2026-001.pdf » */
export function quoteFileName(prefix: string, number: string | null): string {
  const clean = (prefix || 'DEVIS').trim().replace(/[^\w-]+/g, '-').toUpperCase() || 'DEVIS';
  return `${clean}-${number ?? 'BROUILLON'}.pdf`;
}
