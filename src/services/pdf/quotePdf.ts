// Génération du PDF du devis dans le navigateur (jsPDF, chargé à la demande) : aucun serveur.
import type { PublicQuoteView } from '../../features/quotes/publicView';
import { unitShort } from '../../features/catalog/units';
import { formatDate, formatLongDate, formatTime, fromInputDate } from '../../utils/date';
import { formatMoney, formatNumber, formatPercent } from '../../utils/number';
import { blobToDataUrl } from '../storage/exportFormat';

export interface QuotePdfInput {
  /** Vue publique uniquement : aucun coût ni marge ne peut atterrir dans le PDF */
  view: PublicQuoteView;
  loadPhoto: (id: string) => Promise<Blob | undefined>;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [31, 92, 68];
  return [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16)) as [number, number, number];
}

/** Les polices standard du PDF ne couvrent que le Latin-1 (+ €) : on normalise le texte. */
export function pdfText(s: string): string {
  return s
    .replace(/[^\S\n]/g, ' ') // espaces insécables (format français) → espace simple
    .replace(/[’‘]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/≈/g, '~')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF€\n]/g, '');
}

export const INK: [number, number, number] = [29, 36, 33];
export const MUTED: [number, number, number] = [91, 102, 96];
export const SAND: [number, number, number] = [245, 242, 234];
export const LINE: [number, number, number] = [226, 220, 207];

export function imageFormat(dataUrl: string): 'PNG' | 'JPEG' | null {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
  return null;
}

export async function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  return { w: img.naturalWidth, h: img.naturalHeight };
}

export async function generateQuotePdf(input: QuotePdfInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { view } = input;
  const { company, totals } = view;
  const GREEN = hexToRgb(company.brandColor);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 16;
  const BOTTOM = 276;
  let y = M;

  const t = (s: string) => pdfText(s);
  const font = (size: number, style: 'normal' | 'bold' = 'normal', color = INK) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage();
      y = M;
      return true;
    }
    return false;
  };

  // ───── En-tête ─────
  let leftY = y;
  if (company.logoDataUrl && imageFormat(company.logoDataUrl)) {
    try {
      const { w, h } = await imageSize(company.logoDataUrl);
      const scale = Math.min(40 / w, 18 / h);
      doc.addImage(company.logoDataUrl, imageFormat(company.logoDataUrl)!, M, leftY, w * scale, h * scale);
      leftY += h * scale + 4;
    } catch {
      /* logo illisible : ignoré */
    }
  }
  font(13, 'bold');
  doc.text(t(company.name || 'Votre entreprise'), M, leftY + 4);
  leftY += 9;
  font(9, 'normal', MUTED);
  const companyLines = [
    company.address,
    [company.postalCode, company.city].filter(Boolean).join(' '),
    company.phone && `Tél. ${company.phone}`,
    company.email,
    company.siret && `SIRET ${company.siret}`,
    company.vatNumber && !company.vatExempt ? `TVA ${company.vatNumber}` : '',
  ].filter((s): s is string => !!s && !!s.trim());
  for (const l of companyLines) {
    doc.text(t(l), M, leftY);
    leftY += 4.2;
  }

  font(9, 'bold', GREEN);
  doc.text('DEVIS', W - M, y + 4, { align: 'right' });
  font(16, 'bold');
  doc.text(t(`N° ${view.number ?? 'brouillon'}`), W - M, y + 11, { align: 'right' });
  font(9, 'normal', MUTED);
  doc.text(t(`Date : ${formatDate(view.issueDate ?? new Date())}`), W - M, y + 17, { align: 'right' });
  if (view.validUntil) {
    doc.text(t(`Valable jusqu'au ${formatDate(view.validUntil)}`), W - M, y + 21.5, { align: 'right' });
  }
  y = Math.max(leftY, y + 26) + 2;
  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 6;

  // ───── Client & projet ─────
  const boxW = (W - 2 * M - 6) / 2;
  const clientLines = [view.client.address, view.client.phone, view.client.email].filter((s) => s.trim());
  const projectLines = doc.splitTextToSize(t(view.project.title), boxW - 8) as string[];
  const boxH = Math.max(12 + clientLines.length * 4.5, 12 + projectLines.length * 5 + (view.project.siteAddress ? 4.5 : 0)) + 4;
  doc.setFillColor(...SAND);
  doc.roundedRect(M, y, boxW, boxH, 2, 2, 'F');
  doc.roundedRect(M + boxW + 6, y, boxW, boxH, 2, 2, 'F');
  font(7.5, 'bold', MUTED);
  doc.text('CLIENT', M + 4, y + 6);
  doc.text('CHANTIER', M + boxW + 10, y + 6);
  font(10.5, 'bold');
  doc.text(t(view.client.displayName), M + 4, y + 11.5);
  doc.text(projectLines, M + boxW + 10, y + 11.5);
  font(9, 'normal', MUTED);
  clientLines.forEach((l, i) => doc.text(t(l), M + 4, y + 16.5 + i * 4.5, { maxWidth: boxW - 8 }));
  if (view.project.siteAddress) doc.text(t(view.project.siteAddress), M + boxW + 10, y + 11.5 + projectLines.length * 5, { maxWidth: boxW - 8 });
  y += boxH + 7;

  // ───── Description ─────
  if (view.description.trim()) {
    font(8, 'bold', GREEN);
    doc.text('DESCRIPTION DES TRAVAUX', M, y);
    y += 5;
    font(10, 'normal');
    const lines = doc.splitTextToSize(t(view.description), W - 2 * M) as string[];
    for (const l of lines) {
      ensure(5);
      doc.text(l, M, y);
      y += 4.8;
    }
    y += 4;
  }

  // ───── Photos ─────
  const photos = view.photos.slice(0, 8);
  if (photos.length) {
    const cols = 4;
    const gap = 3;
    const pw = (W - 2 * M - gap * (cols - 1)) / cols;
    const ph = pw * 0.75;
    ensure(8 + ph);
    font(8, 'bold', GREEN);
    doc.text('PHOTOS DU CHANTIER', M, y);
    y += 3;
    for (let i = 0; i < photos.length; i++) {
      if (i > 0 && i % cols === 0) {
        y += ph + gap;
        ensure(ph);
      }
      const blob = await input.loadPhoto(photos[i]!.id);
      if (!blob) continue;
      const url = await blobToDataUrl(blob);
      const { w, h } = await imageSize(url);
      // recadrage « cover » approximatif : on garde le ratio en ajustant dans la case
      const scale = Math.min(pw / w, ph / h);
      const dw = w * scale;
      const dh = h * scale;
      const x = M + (i % cols) * (pw + gap);
      doc.setFillColor(...SAND);
      doc.rect(x, y, pw, ph, 'F');
      doc.addImage(url, 'JPEG', x + (pw - dw) / 2, y + (ph - dh) / 2, dw, dh);
    }
    y += ph + 8;
  }

  // ───── Tableau des prestations ─────
  const colQty = W - M - 72;
  const colPU = W - M - 32;
  const colTot = W - M;
  const header = () => {
    doc.setFillColor(...GREEN);
    doc.rect(M, y, W - 2 * M, 8, 'F');
    font(8.5, 'bold', [255, 255, 255]);
    doc.text('Désignation', M + 3, y + 5.3);
    doc.text('Qté', colQty, y + 5.3, { align: 'right' });
    doc.text('P.U. HT', colPU, y + 5.3, { align: 'right' });
    doc.text('Total HT', colTot - 3, y + 5.3, { align: 'right' });
    y += 13.5;
  };
  ensure(20);
  header();
  for (const l of view.lines) {
    font(9.5, 'bold');
    const label = doc.splitTextToSize(t(l.sap ? l.label + ' (SAP)' : l.label), colQty - M - 30) as string[];
    font(8.5, 'normal', MUTED);
    const desc = l.description ? (doc.splitTextToSize(t(l.description), colQty - M - 30) as string[]) : [];
    const note = l.estimated ? ['Quantité estimée - à confirmer'] : [];
    const h = label.length * 4.6 + (desc.length + note.length) * 4 + 3;
    if (ensure(h)) header();
    font(9.5, 'bold');
    doc.text(label, M + 3, y);
    font(9.5, 'normal');
    doc.text(t(`${formatNumber(l.quantity)} ${unitShort(l.unit)}`), colQty, y, { align: 'right' });
    doc.text(t(formatMoney(l.unitPrice)), colPU, y, { align: 'right' });
    font(9.5, 'bold');
    doc.text(t(formatMoney(l.total)), colTot - 3, y, { align: 'right' });
    let ly = y + label.length * 4.6;
    font(8.5, 'normal', MUTED);
    for (const d of desc) {
      doc.text(d, M + 3, ly - 0.6);
      ly += 4;
    }
    if (note.length) {
      doc.setTextColor(138, 90, 0);
      doc.text(note[0]!, M + 3, ly - 0.6);
      ly += 4;
    }
    y = ly;
    doc.setDrawColor(...LINE);
    doc.line(M, y - 2.2, W - M, y - 2.2);
    y += 3;
  }

  // ───── Totaux ─────
  const tx = W - M - 80;
  const totalRow = (label: string, value: string, bold = false) => {
    ensure(6);
    font(9.5, bold ? 'bold' : 'normal', bold ? INK : MUTED);
    doc.text(t(label), tx, y);
    font(9.5, 'bold');
    doc.text(t(value), W - M - 3, y, { align: 'right' });
    y += 5.5;
  };
  y += 2;
  ensure(40);
  totalRow('Total HT', formatMoney(totals.totalHT));
  if (view.vatExempt) {
    font(8.5, 'normal', MUTED);
    doc.text('TVA non applicable, art. 293 B du CGI', tx, y);
    y += 5.5;
  } else totalRow(`TVA ${formatPercent(totals.vatRate)}`, formatMoney(totals.vatAmount));
  doc.setFillColor(...GREEN);
  doc.roundedRect(tx - 3, y - 4, W - M - tx + 3, 10, 1.5, 1.5, 'F');
  font(11, 'bold', [255, 255, 255]);
  doc.text('Total TTC', tx, y + 2.5);
  doc.text(t(formatMoney(totals.totalTTC)), W - M - 3, y + 2.5, { align: 'right' });
  y += 12;
  if (totals.depositPercent > 0) {
    totalRow(`Acompte à la signature (${formatPercent(totals.depositPercent)})`, formatMoney(totals.depositAmount));
    totalRow('Solde à la fin des travaux', formatMoney(totals.balanceAmount));
  }
  y += 4;

  if (totals.hasEstimates) {
    ensure(10);
    font(8.5, 'normal', [138, 90, 0]);
    const lines = doc.splitTextToSize(
      'Certaines quantités sont estimées et seront confirmées par un métré sur place avant le démarrage des travaux.',
      W - 2 * M,
    ) as string[];
    doc.text(lines.map(t), M, y);
    y += lines.length * 4 + 4;
  }

  // ───── Informations SAP (mode actif, numéro renseigné et prestations concernées uniquement) ─────
  if (view.sap) {
    const declared = fromInputDate(view.sap.declarationDate);
    const sapText = [
      'Déclaration SAP n° ' + view.sap.number + (declared ? ' enregistrée le ' + formatDate(declared) : '') + (view.sap.activity ? ' - ' + view.sap.activity : ''),
      'Prestations concernées (marquées SAP) : ' + formatMoney(view.sap.totalHT) + ' HT, soit ' + formatMoney(view.sap.totalTTC) + ' TTC.',
      view.sap.notes,
    ]
      .filter(Boolean)
      .join('\n');
    ensure(14);
    font(8, 'bold', GREEN);
    doc.text('INFORMATIONS SAP - SERVICES À LA PERSONNE', M, y);
    y += 4.5;
    font(8.5, 'normal', MUTED);
    for (const l of doc.splitTextToSize(t(sapText), W - 2 * M) as string[]) {
      ensure(4.2);
      doc.text(l, M, y);
      y += 4.1;
    }
    y += 4;
  }

  // ───── Conditions ─────
  const terms = [view.terms.trim(), company.iban ? `Règlement par virement - IBAN : ${company.iban}` : ''].filter(Boolean).join('\n');
  if (terms) {
    ensure(12);
    font(8, 'bold', GREEN);
    doc.text('CONDITIONS', M, y);
    y += 4.5;
    font(8.5, 'normal', MUTED);
    for (const l of doc.splitTextToSize(t(terms), W - 2 * M) as string[]) {
      ensure(4.2);
      doc.text(l, M, y);
      y += 4.1;
    }
    y += 4;
  }

  // ───── Signature ─────
  ensure(38);
  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 6;
  font(9, 'bold');
  doc.text("L'entreprise", M, y);
  doc.text('Bon pour accord - le client', W / 2 + 3, y);
  font(8.5, 'normal', MUTED);
  doc.text(t(company.name), M, y + 5);
  const sig = view.signature;
  if (sig) {
    const fmt = imageFormat(sig.imageDataUrl);
    if (fmt) {
      try {
        const { w, h } = await imageSize(sig.imageDataUrl);
        const scale = Math.min(60 / w, 20 / h);
        doc.addImage(sig.imageDataUrl, fmt, W / 2 + 3, y + 2, w * scale, h * scale);
      } catch {
        /* image illisible */
      }
    }
    doc.text(t(`Signé par ${sig.signerName}, le ${formatLongDate(sig.signedAt)} à ${formatTime(sig.signedAt)}`), W / 2 + 3, y + 26);
  } else {
    doc.setDrawColor(...LINE);
    doc.rect(W / 2 + 3, y + 3, W / 2 - M - 3, 22);
    font(7.5, 'normal', MUTED);
    doc.text('Date et signature précédées de « Bon pour accord »', W / 2 + 5, y + 8);
  }

  // ───── Pied de page ─────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(7.5, 'normal', MUTED);
    const foot = [company.name, company.siret && `SIRET ${company.siret}`, `Devis ${view.number ?? ''}`].filter(Boolean).join(' · ');
    if (company.quoteFooter.trim()) {
      doc.text(doc.splitTextToSize(t(company.quoteFooter), W - 2 * M - 30) as string[], M, 286);
    }
    doc.text(t(foot), M, 291);
    doc.text(`Page ${i} / ${pages}`, W - M, 291, { align: 'right' });
  }

  return doc.output('blob');
}
