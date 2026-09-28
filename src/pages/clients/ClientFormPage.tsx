import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Trash2 } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextArea } from '../../components/ui/Form';
import { Alert, ConfirmDialog, useToast } from '../../components/ui/Feedback';
import { ClientFields, isClientValid } from '../../components/ClientFields';
import { createClient, deleteClient, emptyClient, updateClient, type ClientInput } from '../../features/clients/actions';
import { NotFoundPage } from '../NotFoundPage';

export function ClientFormPage() {
  const { id } = useParams();
  const { clients, projects } = useAppState();
  const existing = clients.find((c) => c.id === id);
  const navigate = useNavigate();
  const toast = useToast();
  const [value, setValue] = useState<ClientInput>(() => {
    if (!existing) return emptyClient();
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
    return rest;
  });
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (id && !existing) return <NotFoundPage />;
  const projectCount = projects.filter((p) => p.clientId === id).length;

  const save = () => {
    const problem = isClientValid(value);
    if (problem) return setError(problem);
    if (existing) {
      updateClient(existing.id, value);
      toast('Client enregistré.');
      navigate(`/clients/${existing.id}`, { replace: true });
    } else {
      const c = createClient(value);
      toast('Client ajouté.');
      navigate(`/clients/${c.id}`, { replace: true });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader back={existing ? `/clients/${existing.id}` : '/clients'} title={existing ? 'Modifier le client' : 'Nouveau client'} />
      <Card>
        <ClientFields value={value} onChange={setValue} />
        <TextArea className="mt-4" label="Notes" value={value.notes} onChange={(v) => setValue({ ...value, notes: v })} rows={3} />
      </Card>
      {error && <Alert tone="danger">{error}</Alert>}
      {existing && (
        <Button variant="danger" block icon={<Trash2 className="h-5 w-5" />} onClick={() => setConfirm(true)}>
          Supprimer ce client
        </Button>
      )}
      <StickyActions>
        <Button block size="lg" onClick={save}>
          Enregistrer
        </Button>
      </StickyActions>
      <ConfirmDialog
        open={confirm}
        title="Supprimer ce client ?"
        message={
          <p>
            {projectCount > 0
              ? `Ses ${projectCount} chantier${projectCount > 1 ? 's' : ''}, devis et photos seront aussi supprimés définitivement.`
              : 'Cette action est définitive.'}
          </p>
        }
        confirmLabel="Supprimer"
        danger
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          if (!existing) return;
          await deleteClient(existing.id);
          toast('Client supprimé.');
          navigate('/clients', { replace: true });
        }}
      />
    </div>
  );
}
