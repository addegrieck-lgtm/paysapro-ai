import { useEffect, useState } from 'react';
import { Download, MessageSquareHeart, Rocket, Users } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { FeedbackDialog } from '../../components/FeedbackDialog';
import { getCurrentPlan } from '../../features/plans/plans';
import { betaLeads } from '../../services/forms/forms';
import { downloadBlob } from '../../lib/share';
import { formatDate } from '../../utils/date';
import type { BetaLead } from '../../types';

function toCsv(leads: BetaLead[]): string {
  const cols: (keyof BetaLead)[] = ['createdAt', 'firstName', 'lastName', 'company', 'email', 'phone', 'activity', 'teamSize', 'quotesPerMonth', 'currentSoftware', 'mainProblem', 'comment'];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [cols.join(';'), ...leads.map((l) => cols.map((c) => esc(String(l[c] ?? ''))).join(';'))].join('\n');
}

export function BetaProgramPage() {
  const plan = getCurrentPlan();
  const [feedback, setFeedback] = useState(false);
  const [leads, setLeads] = useState<BetaLead[]>([]);

  useEffect(() => {
    void betaLeads.list().then(setLeads).catch(() => setLeads([]));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Programme bêta" />
      <Card className="border-brand/40 bg-brand-soft/50">
        <div className="flex items-start gap-3">
          <Rocket className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="font-semibold text-ink">Vous utilisez actuellement Paysapro AI {plan.name} gratuitement pendant la phase bêta.</p>
            <p className="mt-1 text-sm text-muted">Toutes les fonctionnalités sont ouvertes, sans carte bancaire. Le prix définitif sera annoncé avant la fin de la bêta.</p>
          </div>
        </div>
      </Card>
      <Card>
        <CardTitle icon={<MessageSquareHeart className="h-5 w-5" />}>Votre feedback nous aide</CardTitle>
        <p className="text-muted">Dites-nous ce qui vous fait gagner du temps… et ce qui vous en fait perdre. Chaque retour est lu.</p>
        <Button className="mt-3" onClick={() => setFeedback(true)}>
          Donner mon avis
        </Button>
      </Card>
      <Card>
        <CardTitle icon={<Users className="h-5 w-5" />}>Inscriptions bêta reçues sur cet appareil</CardTitle>
        <p className="text-sm text-muted">
          Utile lors d’un salon ou d’une démonstration : le formulaire « Rejoindre la bêta » rempli sur cet appareil est enregistré ici.
        </p>
        {leads.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune inscription pour l’instant.</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line">
              {leads.map((l) => (
                <li key={l.id} className="py-2 text-sm">
                  <span className="font-medium">
                    {l.firstName} {l.lastName}
                  </span>
                  {l.company && ` · ${l.company}`} · {l.email} <span className="text-muted">· {formatDate(l.createdAt)}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-3"
              variant="soft"
              icon={<Download className="h-4 w-4" />}
              onClick={() => downloadBlob(new Blob(['﻿' + toCsv(leads)], { type: 'text/csv;charset=utf-8' }), 'inscriptions-beta.csv')}
            >
              Exporter (CSV)
            </Button>
          </>
        )}
        <ButtonLink to="/beta" variant="ghost" size="sm" className="mt-2">
          Ouvrir le formulaire d’inscription
        </ButtonLink>
      </Card>
      <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
    </div>
  );
}
