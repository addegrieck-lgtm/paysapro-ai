import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import type { CompanySettings } from '../types';
import { Checkbox, TextField } from './ui/Form';
import { Button } from './ui/Button';
import { useToast } from './ui/Feedback';
import { fileToLogoDataUrl } from '../services/images/logo';
import { isValidEmail } from '../utils/validation';

type Section = 'identity' | 'contact' | 'legal';

export function CompanyFields({
  value,
  onChange,
  sections = ['identity', 'contact', 'legal'],
}: {
  value: CompanySettings;
  onChange: (v: CompanySettings) => void;
  sections?: Section[];
}) {
  const toast = useToast();
  const logoRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof CompanySettings) => (v: string) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      {sections.includes('identity') && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white">
              {value.logoDataUrl ? <img src={value.logoDataUrl} alt="Logo de l’entreprise" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-neutral-400">Logo</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="soft" size="sm" icon={<ImagePlus className="h-4 w-4" />} onClick={() => logoRef.current?.click()}>
                {value.logoDataUrl ? 'Changer' : 'Ajouter un logo'}
              </Button>
              {value.logoDataUrl && (
                <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => onChange({ ...value, logoDataUrl: null })}>
                  Retirer
                </Button>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  onChange({ ...value, logoDataUrl: await fileToLogoDataUrl(f) });
                } catch {
                  toast('Image illisible. Essayez un fichier PNG ou JPEG.', 'danger');
                }
              }}
            />
          </div>
          <TextField label="Nom de l’entreprise" value={value.name} onChange={set('name')} autoComplete="organization" />
        </>
      )}
      {sections.includes('contact') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Adresse" value={value.address} onChange={set('address')} className="sm:col-span-2" autoComplete="street-address" />
          <TextField label="Code postal" value={value.postalCode} onChange={set('postalCode')} inputMode="numeric" autoComplete="postal-code" />
          <TextField label="Ville" value={value.city} onChange={set('city')} autoComplete="address-level2" />
          <TextField label="Téléphone" type="tel" value={value.phone} onChange={set('phone')} autoComplete="tel" />
          <TextField
            label="E-mail"
            type="email"
            value={value.email}
            onChange={set('email')}
            autoComplete="email"
            error={isValidEmail(value.email) ? null : 'Adresse e-mail invalide.'}
          />
        </div>
      )}
      {sections.includes('legal') && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="SIRET" value={value.siret} onChange={set('siret')} inputMode="numeric" />
          <TextField label="N° de TVA intracommunautaire" value={value.vatNumber} onChange={set('vatNumber')} disabled={value.vatExempt} />
          <div className="sm:col-span-2">
            <Checkbox checked={value.vatExempt} onChange={(v) => onChange({ ...value, vatExempt: v })}>
              TVA non applicable (micro-entreprise, art. 293 B du CGI)
            </Checkbox>
          </div>
          <TextField
            label="IBAN (facultatif)"
            value={value.iban}
            onChange={set('iban')}
            className="sm:col-span-2"
            hint="Affiché sur le devis pour le paiement de l’acompte par virement."
          />
        </div>
      )}
    </div>
  );
}
