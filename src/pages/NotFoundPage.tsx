import { SearchX } from 'lucide-react';
import { EmptyState } from '../components/ui/Feedback';
import { ButtonLink } from '../components/ui/Button';

export function NotFoundPage({ message }: { message?: string }) {
  return (
    <div className="pt-10">
      <EmptyState icon={<SearchX className="h-7 w-7" />} title="Page introuvable" action={<ButtonLink to="/app">Retour au tableau de bord</ButtonLink>}>
        {message ?? 'Cette page n’existe pas.'}
      </EmptyState>
    </div>
  );
}
