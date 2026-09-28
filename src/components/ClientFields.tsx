import { TextField } from './ui/Form';
import type { ClientInput } from '../features/clients/actions';
import { isValidEmail } from '../utils/validation';

/** Champs d'une fiche client (création de chantier, fiche client). */
export function ClientFields({ value, onChange }: { value: ClientInput; onChange: (v: ClientInput) => void }) {
  const set = (k: keyof ClientInput) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Nom" value={value.lastName} onChange={set('lastName')} autoComplete="family-name" autoCapitalize="words" />
      <TextField label="Prénom" value={value.firstName} onChange={set('firstName')} autoComplete="given-name" autoCapitalize="words" />
      <TextField
        label="Société (facultatif)"
        value={value.companyName}
        onChange={set('companyName')}
        autoComplete="organization"
        className="sm:col-span-2"
      />
      <TextField label="Téléphone" type="tel" value={value.phone} onChange={set('phone')} autoComplete="tel" inputMode="tel" />
      <TextField
        label="E-mail"
        type="email"
        value={value.email}
        onChange={set('email')}
        autoComplete="email"
        inputMode="email"
        error={isValidEmail(value.email) ? null : 'Adresse e-mail invalide.'}
      />
      <TextField label="Adresse" value={value.address} onChange={set('address')} autoComplete="street-address" className="sm:col-span-2" />
      <TextField label="Code postal" value={value.postalCode} onChange={set('postalCode')} autoComplete="postal-code" inputMode="numeric" />
      <TextField label="Ville" value={value.city} onChange={set('city')} autoComplete="address-level2" />
    </div>
  );
}

export function isClientValid(c: ClientInput): string | null {
  if (!c.lastName.trim() && !c.firstName.trim() && !c.companyName.trim()) return 'Veuillez renseigner au moins un nom.';
  if (!isValidEmail(c.email)) return 'Adresse e-mail invalide.';
  return null;
}
