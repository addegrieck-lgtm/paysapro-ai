import { Check, Clock, CreditCard, Rocket } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge, Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FEATURES, PAID_PLANS, planFor, priceLabel, type Plan } from '../../features/plans/plans';
import { APP_CONFIG } from '../../config/app';
import { formatDate } from '../../utils/date';

const STATUS_LABEL: Record<string, string> = {
  beta: 'Bêta',
  active: 'Actif',
  trialing: 'Période d’essai',
  past_due: 'Paiement en retard',
  canceled: 'Résilié',
  inactive: 'Inactif',
};

function FeatureList({ plan }: { plan: Plan }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm">
      {plan.features.map((f) => (
        <li key={f} className="flex items-start gap-2">
          {FEATURES[f].status === 'available' ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          )}
          <span className={FEATURES[f].status === 'planned' ? 'text-muted' : ''}>
            {FEATURES[f].label}
            {FEATURES[f].status === 'planned' && ' — à venir'}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Paramètres → Abonnement : plan actuel, prix, fonctionnalités, statut, limites. */
export function SubscriptionPage() {
  const { subscription } = useAppState();
  const beta = APP_CONFIG.betaMode;
  const plan = planFor(beta, subscription);
  const status = beta ? 'beta' : (subscription?.status ?? 'inactive');

  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Abonnement" />

      <Card className={beta ? 'border-brand/40 bg-brand-soft/50' : ''}>
        <CardTitle icon={beta ? <Rocket className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}>Votre plan</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-bold">{plan.name}</span>
          <Badge tone={status === 'past_due' || status === 'inactive' || status === 'canceled' ? 'warning' : 'success'}>{STATUS_LABEL[status] ?? status}</Badge>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums">{beta ? '0 €' : priceLabel(plan)}</p>
        {beta ? (
          <p className="mt-2 font-medium text-ink">BÊTA — Premium Max offert. Aucun paiement requis, aucune carte bancaire demandée.</p>
        ) : (
          subscription?.currentPeriodEnd && <p className="mt-2 text-sm text-muted">Période en cours jusqu’au {formatDate(subscription.currentPeriodEnd)}.</p>
        )}
        {!beta && plan.features.length === 0 && <p className="mt-2 text-warning">Aucun abonnement actif : choisissez une offre pour continuer à créer des devis.</p>}
        <FeatureList plan={plan} />
      </Card>

      <Card>
        <CardTitle>Limites</CardTitle>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Utilisateurs inclus</dt>
            <dd className="font-medium">{plan.limits.users} — gestion d’équipe à venir</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">IA avancée</dt>
            <dd className="text-right font-medium">{plan.limits.aiRequestsPerMonth} requêtes / mois — à venir</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted">L’assistant actuel fonctionne sur votre appareil, sans quota. L’utilisation de l’IA avancée s’affichera ici lorsqu’elle sera disponible.</p>
      </Card>

      <Card>
        <CardTitle>{beta ? 'Offres prévues après la bêta' : 'Changer de plan'}</CardTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {PAID_PLANS.map((p) => (
            <div key={p.id} className={`rounded-xl border p-4 ${!beta && p.id === plan.id && plan.features.length > 0 ? 'border-brand' : 'border-line'}`}>
              <div className="font-semibold">{p.name}</div>
              <div className="text-lg font-bold tabular-nums">{priceLabel(p)}</div>
              <div className="mt-1 text-sm text-muted">
                {p.features.length} fonctionnalités · {p.limits.users} utilisateur{p.limits.users > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" disabled>
            Changer de plan
          </Button>
          <Button variant="secondary" disabled>
            Gérer l’abonnement
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted">
          {beta
            ? 'Le paiement n’est pas activé pendant la bêta. Vous serez prévenu à l’avance, et rien ne sera facturé sans votre accord.'
            : 'Le paiement en ligne n’est pas encore activé : disponible prochainement.'}
        </p>
      </Card>
    </div>
  );
}
