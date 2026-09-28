import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { NumberField, SelectField, TextField } from '../../components/ui/Form';
import { Alert } from '../../components/ui/Feedback';
import { updateSettings } from '../../features/settings/actions';
import { formatQuoteNumber, quoteFileName } from '../../features/quotes/numbering';

export function QuoteSettingsPage() {
  const { settings } = useAppState();
  const year = new Date().getFullYear();
  const nextSeq = settings.quoteCounter.year === year ? settings.quoteCounter.next : 1;
  const nextNumber = formatQuoteNumber(year, nextSeq);

  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Paramètres des devis" subtitle="Valeurs par défaut des nouveaux devis. Enregistrement automatique." />

      <Card>
        <CardTitle>TVA</CardTitle>
        {settings.company.vatExempt ? (
          <Alert tone="info">TVA non applicable (micro-entreprise) : réglage dans « Entreprise ».</Alert>
        ) : (
          <SelectField
            label="Taux de TVA par défaut"
            value={String(settings.vatRate)}
            onChange={(v) => updateSettings({ vatRate: Number(v) })}
            options={[
              { value: '20', label: '20 % (taux normal)' },
              { value: '10', label: '10 % (taux intermédiaire)' },
              { value: '5.5', label: '5,5 % (taux réduit)' },
              { value: '0', label: '0 %' },
            ]}
            hint="Le taux applicable dépend des travaux et du client : vérifiez auprès de votre comptable."
          />
        )}
      </Card>

      <Card>
        <CardTitle>Marge, acompte et tarifs</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Marge par défaut" suffix="%" max={100} value={settings.defaultMarginPercent} onChange={(v) => updateSettings({ defaultMarginPercent: v ?? 0 })} hint="Mettez 0 % si vos prix incluent déjà votre marge." className="col-span-2" />
          <NumberField label="Acompte" suffix="%" max={100} value={settings.defaultDepositPercent} onChange={(v) => updateSettings({ defaultDepositPercent: v ?? 0 })} />
          <NumberField label="Validité" suffix="jours" min={1} value={settings.quoteValidityDays} onChange={(v) => v !== null && updateSettings({ quoteValidityDays: Math.round(v) })} />
          <NumberField label="Taux horaire" suffix="€/h" value={settings.hourlyRate} onChange={(v) => updateSettings({ hourlyRate: v ?? 0 })} />
          <NumberField label="Taux journalier" suffix="€/j" value={settings.dailyRate} onChange={(v) => updateSettings({ dailyRate: v ?? 0 })} />
        </div>
      </Card>

      <Card>
        <CardTitle>Numérotation</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Préfixe du fichier" value={settings.quotePrefix} onChange={(v) => updateSettings({ quotePrefix: v.toUpperCase() })} />
          <NumberField
            label="Prochain numéro"
            min={1}
            value={nextSeq}
            onChange={(v) => v !== null && v >= 1 && updateSettings({ quoteCounter: { year, next: Math.floor(v) } })}
          />
        </div>
        <p className="mt-3 text-sm text-muted">
          Prochain devis : <strong className="text-ink">N° {nextNumber}</strong> · fichier {quoteFileName(settings.quotePrefix, nextNumber)}. La numérotation repart à 001 chaque année.
        </p>
      </Card>
    </div>
  );
}
