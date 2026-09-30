// PDF de l'attestation fiscale annuelle SAP (jsPDF, chargé à la demande) : aucun serveur.
// Le document ne contient que les données enregistrées par l'entreprise ; il ne certifie rien.
import type { SapAttestation } from '../../features/sap/sap';
import { SAP_DISCLAIMER } from '../../features/sap/sap';
import { unitShort } from '../../features/catalog/units';
import { formatDate, formatLongDate, fromInputDate } from '../../utils/date';
import { formatMoney, formatNumber } from '../../utils/number';
import { paymentMethodLabel } from '../payments/PaymentProvider';
import { hexToRgb, imageFormat, imageSize, INK, LINE, MUTED, pdfText, SAND } from './quotePdf';

export async function generateSapAttestationPdf(a: SapAttestation, generatedAt = new Date()): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const { company } = a;
  const BRAND = hexToRgb(company.brandColor);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 16;
  const BOTTOM = 272;
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
    }
  };
  const heading = (s: string) => {
    ensure(12);
    font(8, 'bold', BRAND);
    doc.text(t(s.toUpperCase()), M, y);
    y += 5;
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
  doc.text(t(company.name), M, leftY + 4);
  leftY += 9;
  font(9, 'normal', MUTED);
  const companyLines = [
    company.address,
    [company.postalCode, company.city].filter(Boolean).join(' '),
    company.phone && `Tél. ${company.phone}`,
    company.email,
    company.siret && `SIREN / SIRET ${company.siret}`,
  ].filter((s): s is string => !!s && !!s.trim());
  for (const l of companyLines) {
    doc.text(t(l), M, leftY);
    leftY += 4.2;
  }

  font(9, 'bold', BRAND);
  doc.text('SERVICES À LA PERSONNE', W - M, y + 4, { align: 'right' });
  font(15, 'bold');
  doc.text('Attestation fiscale annuelle', W - M, y + 11, { align: 'right' });
  font(9, 'normal', MUTED);
  doc.text(t(`Année ${a.year} - du 01/01/${a.year} au 31/12/${a.year}`), W - M, y + 17, { align: 'right' });
  doc.text(t(`Générée le ${formatDate(generatedAt)}`), W - M, y + 21.5, { align: 'right' });
  y = Math.max(leftY, y + 26) + 2;
  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 6;

  // ───── Déclaration SAP & client ─────
  const boxW = (W - 2 * M - 6) / 2;
  const declared = fromInputDate(company.sap.declarationDate);
  const sapLines = [
    `N° ${company.sap.number}`,
    declared ? `Enregistrée le ${formatDate(declared)}` : '',
    company.sap.activity ? `Activité : ${company.sap.activity}` : '',
  ].filter(Boolean);
  font(9, 'normal');
  const sapWrapped = sapLines.flatMap((l) => doc.splitTextToSize(t(l), boxW - 8) as string[]);
  const clientWrapped = doc.splitTextToSize(t(a.client.address), boxW - 8) as string[];
  const boxH = Math.max(10 + sapWrapped.length * 4.5, 15 + clientWrapped.length * 4.5) + 4;
  doc.setFillColor(...SAND);
  doc.roundedRect(M, y, boxW, boxH, 2, 2, 'F');
  doc.roundedRect(M + boxW + 6, y, boxW, boxH, 2, 2, 'F');
  font(7.5, 'bold', MUTED);
  doc.text('DÉCLARATION SAP', M + 4, y + 6);
  doc.text('BÉNÉFICIAIRE', M + boxW + 10, y + 6);
  font(9, 'normal');
  sapWrapped.forEach((l, i) => doc.text(l, M + 4, y + 11.5 + i * 4.5));
  font(10.5, 'bold');
  doc.text(t(a.client.displayName), M + boxW + 10, y + 11.5);
  font(9, 'normal', MUTED);
  clientWrapped.forEach((l, i) => doc.text(l, M + boxW + 10, y + 16.5 + i * 4.5));
  y += boxH + 8;

  // ───── Texte ─────
  font(10, 'normal');
  const intro = `${company.name} atteste que ${a.client.displayName} a réglé, au cours de l'année ${a.year}, la somme de ${formatMoney(a.totalPaidSap)} TTC au titre des prestations de services à la personne détaillées ci-dessous.`;
  for (const l of doc.splitTextToSize(t(intro), W - 2 * M) as string[]) {
    doc.text(l, M, y);
    y += 5;
  }
  y += 4;

  // ───── Prestations ─────
  heading('Prestations réalisées');
  for (const e of a.entries) {
    if (e.payments.length === 0) continue;
    ensure(16);
    font(10, 'bold');
    doc.text(t(e.projectTitle + (e.quoteNumber ? ` - devis n° ${e.quoteNumber}` : '')), M, y, { maxWidth: W - 2 * M });
    y += 4.8;
    font(8.5, 'normal', MUTED);
    const start = fromInputDate(e.startDate);
    const end = fromInputDate(e.endDate);
    const dates = start ? (end && e.endDate !== e.startDate ? `Interventions du ${formatDate(start)} au ${formatDate(end)}` : `Intervention le ${formatDate(start)}`) : '';
    if (dates) {
      doc.text(t(dates), M, y);
      y += 4.5;
    }
    y += 1;
    for (const l of e.lines) {
      ensure(5.5);
      font(9.5, 'normal');
      doc.text(t(l.label), M + 3, y, { maxWidth: 110 });
      doc.text(t(`${formatNumber(l.quantity)} ${unitShort(l.unit)}`), W - M - 40, y, { align: 'right' });
      doc.text(t(`${formatMoney(l.totalHT)} HT`), W - M - 3, y, { align: 'right' });
      y += 5;
    }
    ensure(6);
    font(9.5, 'bold');
    doc.text('Prestations SAP (TTC)', M + 3, y);
    doc.text(t(formatMoney(e.sapTotalTTC)), W - M - 3, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(...LINE);
    doc.line(M, y, W - M, y);
    y += 6;
  }

  // ───── Paiements ─────
  heading(`Montants acquittés en ${a.year}`);
  for (const e of a.entries) {
    for (const p of e.payments) {
      ensure(5.5);
      font(9.5, 'normal');
      doc.text(t(`${formatDate(p.date)} - ${paymentMethodLabel(p.method)}${e.quoteNumber ? ` - devis n° ${e.quoteNumber}` : ''}`), M + 3, y);
      doc.text(t(formatMoney(p.sapAmount)), W - M - 3, y, { align: 'right' });
      y += 5;
    }
  }
  y += 2;
  ensure(14);
  doc.setFillColor(...BRAND);
  doc.roundedRect(M, y - 4, W - 2 * M, 10, 1.5, 1.5, 'F');
  font(11, 'bold', [255, 255, 255]);
  doc.text(t(`Total acquitté en ${a.year} (TTC)`), M + 3, y + 2.5);
  doc.text(t(formatMoney(a.totalPaidSap)), W - M - 3, y + 2.5, { align: 'right' });
  y += 12;

  const special: string[] = [];
  if (a.byMethod.cesu) special.push(`dont ${formatMoney(a.byMethod.cesu)} réglés en CESU préfinancé`);
  if (a.byMethod.cash) special.push(`dont ${formatMoney(a.byMethod.cash)} réglés en espèces`);
  if (a.hasMixedQuotes) special.push('Lorsque le devis comporte aussi des prestations hors SAP, les règlements sont répartis au prorata des prestations SAP.');
  if (company.sap.notes.trim()) special.push(company.sap.notes.trim());
  font(8.5, 'normal', MUTED);
  for (const s of special) {
    for (const l of doc.splitTextToSize(t(s), W - 2 * M) as string[]) {
      ensure(4.5);
      doc.text(l, M, y);
      y += 4.2;
    }
    y += 1;
  }

  // ───── Date & signature ─────
  y += 4;
  ensure(30);
  font(9.5, 'normal');
  doc.text(t(`Fait le ${formatLongDate(generatedAt)}${company.city ? `, à ${company.city}` : ''}`), M, y);
  doc.text(t(`Pour ${company.name}`), W / 2 + 3, y);
  doc.setDrawColor(...LINE);
  doc.rect(W / 2 + 3, y + 3, W / 2 - M - 3, 20);
  font(7.5, 'normal', MUTED);
  doc.text('Nom, qualité et signature', W / 2 + 5, y + 8);

  // ───── Pied de page ─────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(7, 'normal', MUTED);
    doc.text(doc.splitTextToSize(t(SAP_DISCLAIMER), W - 2 * M) as string[], M, 282);
    doc.text(t([company.name, company.siret && `SIRET ${company.siret}`, `Attestation SAP ${a.year}`].filter(Boolean).join(' · ')), M, 291);
    doc.text(`Page ${i} / ${pages}`, W - M, 291, { align: 'right' });
  }

  return doc.output('blob');
}
