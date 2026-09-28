import { ChevronDown, Mail, MessageSquareHeart } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button, ButtonLink } from '../components/ui/Button';
import { FeedbackDialog } from '../components/FeedbackDialog';
import { FAQ } from '../data/faq';

export function HelpPage() {
  const [feedback, setFeedback] = useState(false);
  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Besoin d’aide ?" subtitle="Les réponses aux questions les plus fréquentes." />
      <div className="space-y-2">
        {FAQ.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-line bg-surface p-4 open:shadow-card">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              {f.q}
              <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-2 leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
      <Card>
        <p className="font-semibold">Vous ne trouvez pas la réponse ?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <ButtonLink to="/contact" variant="soft" icon={<Mail className="h-5 w-5" />}>
            Nous écrire
          </ButtonLink>
          <Button variant="secondary" icon={<MessageSquareHeart className="h-5 w-5" />} onClick={() => setFeedback(true)}>
            Donner mon avis
          </Button>
        </div>
      </Card>
      <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
    </div>
  );
}
