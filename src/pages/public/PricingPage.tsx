import { Check, Rocket } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { useStartLink } from '../../layouts/PublicLayout';
import { PLANS } from '../../features/plans/plans';

const INCLUDED = [
  'Devis illimités',
  'Clients illimités',
  'Chantiers et suivi des travaux',
  'Catalogue de prestations et modèles',
  'Calculs automatiques (surfaces, quantités, TVA, marge)',
  'Signature du devis par le client',
  'PDF professionnel à vos couleurs',
  'Fonctionnalités IA disponibles',
  'Aucune carte bancaire',
];

export function PricingPage() {
  const start = useStartLink();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-center text-4xl font-bold tracking-tight">Tarifs</h1>
      <p className="mt-3 text-center text-lg text-muted">Simple : pendant la bêta, tout est gratuit.</p>

      <div className="mx-auto mt-10 max-w-lg rounded-3xl border-2 border-brand bg-surface p-7 shadow-card">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-sm font-bold text-on-brand">
            <Rocket className="h-4 w-4" aria-hidden /> BÊTA
          </span>
          <span className="text-sm font-semibold text-brand">Accès {PLANS.PREMIUM_MAX.name}</span>
        </div>
        <p className="mt-5 text-5xl font-bold tracking-tight">
          0 €<span className="text-xl font-medium text-muted">/mois</span>
        </p>
        <ul className="mt-6 space-y-2.5">
          {INCLUDED.map((i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /> {i}
            </li>
          ))}
        </ul>
        <ButtonLink to={start.to} block size="lg" className="mt-7">
          {start.label}
        </ButtonLink>
        <p className="mt-4 text-center text-sm text-muted">Le prix définitif sera annoncé avant la fin de la période bêta.</p>
      </div>

      <h2 className="mt-14 text-center text-xl font-semibold">Offres prévues après la bêta</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[PLANS.FREE, PLANS.PRO, PLANS.PREMIUM].map((p) => (
          <div key={p.id} className="rounded-2xl border border-line bg-surface p-5 text-center">
            <div className="font-semibold">{p.name}</div>
            <div className="mt-1 text-muted">{p.priceLabel}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-muted">Aucun prix n’est encore fixé. Les utilisateurs de la bêta seront informés à l’avance.</p>
    </div>
  );
}
