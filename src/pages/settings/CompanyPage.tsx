import { useState } from 'react';
import { Building2, ChevronRight, Palette, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { useAppState } from '../../lib/store';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextArea } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Feedback';
import { CompanyFields } from '../../components/CompanyFields';
import { updateCompany } from '../../features/settings/actions';
import { isValidEmail } from '../../utils/validation';
import { formatPercent } from '../../utils/number';
import { DEFAULT_BRAND_COLOR } from '../../data/defaults';

const PRESETS = ['#1f5c44', '#2f6f3e', '#3b5b2a', '#155e63', '#1e3a5f', '#4a3b2a', '#6b2d2d', '#2b2b2b'];

/** Luminance relative (WCAG) : une couleur trop claire rendrait le texte blanc illisible. */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1]!.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function CompanyPage() {
  const { settings } = useAppState();
  const toast = useToast();
  const [company, setCompany] = useState(settings.company);
  const tooLight = luminance(company.brandColor) > 0.28;

  return (
    <div className="space-y-5">
      <PageHeader title="Mon entreprise" subtitle="Ces informations apparaissent sur vos devis." />

      <Card>
        <CardTitle icon={<Building2 className="h-5 w-5" />}>Informations</CardTitle>
        <CompanyFields value={company} onChange={setCompany} />
      </Card>

      <Card>
        <CardTitle icon={<Palette className="h-5 w-5" />}>Apparence des devis</CardTitle>
        <p className="mb-2 text-sm font-medium">Couleur principale</p>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Couleur ${c}`}
              aria-pressed={company.brandColor.toLowerCase() === c}
              onClick={() => setCompany({ ...company, brandColor: c })}
              className={`h-10 w-10 rounded-full border-2 ${company.brandColor.toLowerCase() === c ? 'border-ink ring-2 ring-offset-2 ring-offset-surface' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="flex h-10 items-center gap-2 rounded-full border border-line px-3 text-sm">
            <span>Autre</span>
            <input type="color" value={company.brandColor} onChange={(e) => setCompany({ ...company, brandColor: e.target.value })} aria-label="Choisir une couleur" className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0" />
          </label>
        </div>
        {tooLight && <p className="mt-2 text-sm text-warning">Couleur trop claire : le texte blanc des totaux serait peu lisible. Choisissez une teinte plus foncée.</p>}
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white" aria-hidden>
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: tooLight ? DEFAULT_BRAND_COLOR : company.brandColor }}>
            <span className="text-xs font-semibold uppercase tracking-widest">Devis N° 2026-001</span>
            <span className="font-bold">Total TTC 4 850,00 €</span>
          </div>
        </div>
        <TextArea
          className="mt-4"
          label="Pied de page des devis"
          value={company.quoteFooter}
          onChange={(v) => setCompany({ ...company, quoteFooter: v })}
          rows={2}
          placeholder="Ex. Assurance décennale n°… — Membre de l’Union nationale des entreprises du paysage"
        />
        <TextArea
          className="mt-4"
          label="Conditions (reprises sur chaque nouveau devis)"
          value={company.terms}
          onChange={(v) => setCompany({ ...company, terms: v })}
          rows={5}
        />
      </Card>

      <Link to="/settings/quotes" className="block">
        <Card className="flex items-center gap-3 hover:border-brand/40">
          <SlidersHorizontal className="h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Paramètres des devis</div>
            <div className="truncate text-sm text-muted">
              Acompte {formatPercent(settings.defaultDepositPercent)} · validité {settings.quoteValidityDays} jours · TVA{' '}
              {settings.company.vatExempt ? 'non applicable' : formatPercent(settings.vatRate)} · numérotation
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
        </Card>
      </Link>

      <StickyActions>
        <Button
          block
          size="lg"
          onClick={() => {
            if (!isValidEmail(company.email)) return toast('Adresse e-mail invalide.', 'danger');
            updateCompany({ ...company, brandColor: tooLight ? DEFAULT_BRAND_COLOR : company.brandColor });
            toast('✓ Entreprise enregistrée');
          }}
        >
          Enregistrer
        </Button>
      </StickyActions>
    </div>
  );
}
