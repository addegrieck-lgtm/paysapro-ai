import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultCatalog, defaultSettings } from '../src/data/defaults';
import { buildDemoData } from '../src/features/demo/demoData';
import { computeTotals } from '../src/features/quotes/pricing';
import { generateQuotePdf, pdfText } from '../src/services/pdf/quotePdf';

describe('PDF du devis', () => {
  it('normalise le texte pour les polices PDF', () => {
    expect(pdfText('2 899,00 € – œuvre ≈ 85 m²')).toBe("2 899,00 € - oeuvre ~ 85 m²");
    expect(pdfText('ligne 1\nligne 2')).toBe('ligne 1\nligne 2');
  });

  it('génère un PDF valide (devis signé, plusieurs lignes)', async () => {
    const settings = defaultSettings();
    settings.company = { ...settings.company, name: 'Jardins du Val Vert', address: '5 chemin des Prés', postalCode: '69100', city: 'Villeurbanne', phone: '06 12 34 56 78', siret: '123 456 789 00012', iban: 'FR76 0000 0000 0000 0000 0000 000' };
    const demo = buildDemoData(defaultCatalog(), settings, new Date(2026, 8, 28));
    const quote = { ...demo.quotes[0]!, includedPhotoIds: [], description: 'Création d’une pelouse en rouleaux, massif avec un olivier et bordures acier.' };
    const project = demo.projects[0]!;
    const blob = await generateQuotePdf({
      quote,
      project,
      client: demo.clients[0],
      company: settings.company,
      totals: computeTotals(quote, project),
      photos: [],
      loadPhoto: async () => undefined,
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(3000);
    if (process.env.PDF_OUT) writeFileSync(process.env.PDF_OUT, bytes);
  });
});
