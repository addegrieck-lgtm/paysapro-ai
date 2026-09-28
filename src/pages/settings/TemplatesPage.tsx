import { LayoutTemplate, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge, Card } from '../../components/ui/Card';
import { ButtonLink, IconButton } from '../../components/ui/Button';
import { ConfirmDialog, EmptyState, useToast } from '../../components/ui/Feedback';
import { deleteTemplate } from '../../features/templates/actions';
import { categoriesText } from '../../features/projects/status';
import type { QuoteTemplate } from '../../types';

export function TemplatesPage() {
  const { templates } = useAppState();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<QuoteTemplate | null>(null);

  return (
    <div className="space-y-5">
      <PageHeader back="/catalog" title="Modèles de devis" subtitle="Créez un devis en un geste à partir d’un modèle." />
      <ButtonLink to="/quotes/new" block>
        Nouveau devis à partir d’un modèle
      </ButtonLink>
      {templates.length === 0 ? (
        <EmptyState icon={<LayoutTemplate className="h-7 w-7" />} title="Aucun modèle">
          Depuis l’écran « Prestations & prix » d’un devis, touchez « Enregistrer ces prestations comme modèle ».
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{t.name}</h2>
                    <Badge tone={t.builtIn ? 'neutral' : 'success'}>{t.builtIn ? 'Fourni' : 'Mon modèle'}</Badge>
                  </div>
                  <p className="text-sm text-muted">{categoriesText(t.categories)}</p>
                  <p className="mt-2 text-sm text-ink">{[...t.items.map((i) => i.label), ...t.lines.map((l) => l.label)].join(' · ')}</p>
                </div>
                <IconButton label={`Supprimer le modèle ${t.name}`} onClick={() => setToDelete(t)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="text-sm text-muted">Astuce : dans un devis, écran « Prestations & prix », touchez « Enregistrer ces prestations comme modèle ».</p>
      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer ce modèle ?"
        message={<p>« {toDelete?.name} » ne sera plus proposé. Les devis existants ne sont pas modifiés.</p>}
        confirmLabel="Supprimer"
        danger
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteTemplate(toDelete.id);
          setToDelete(null);
          toast('Modèle supprimé.');
        }}
      />
    </div>
  );
}
