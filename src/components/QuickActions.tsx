import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Camera, ChevronRight, ClipboardList, FileText, UserPlus } from 'lucide-react';
import { useAppState } from '../lib/store';
import { Drawer } from './ui/Extras';
import { clientDisplayName } from '../features/clients/format';
import { projectTitle } from '../features/projects/actions';

export const QUICK_ACTIONS = [
  { key: 'quote', label: 'Nouveau devis', hint: 'Le parcours complet, du client à la signature', icon: FileText, to: '/quotes/new' },
  { key: 'client', label: 'Nouveau client', hint: 'Ajouter une fiche client', icon: UserPlus, to: '/clients/new' },
  { key: 'project', label: 'Nouveau chantier', hint: 'Sans devis pour l’instant', icon: ClipboardList, to: '/projects/new' },
  { key: 'photo', label: 'Ajouter une photo', hint: 'À un chantier existant', icon: Camera, to: null },
] as const;

/** Panneau « + » : les 4 actions les plus fréquentes. */
export function QuickActionsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { projects, clients } = useAppState();
  const [pickProject, setPickProject] = useState(false);
  const recent = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);

  const close = () => {
    setPickProject(false);
    onClose();
  };
  const go = (to: string) => {
    close();
    navigate(to);
  };

  return (
    <Drawer open={open} onClose={close} title={pickProject ? 'Ajouter une photo à…' : 'Créer'}>
      {!pickProject ? (
        <ul className="space-y-1">
          {QUICK_ACTIONS.map(({ key, label, hint, icon: Icon, to }) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => (to ? go(to) : projects.length ? setPickProject(true) : go('/quotes/new'))}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 text-left hover:bg-surface-2"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${key === 'quote' ? 'bg-brand text-on-brand' : 'bg-brand-soft text-brand'}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{label}</span>
                  <span className="block truncate text-sm text-muted">{hint}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="max-h-[55vh] space-y-1 overflow-y-auto">
          {recent.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => go(`/projects/${p.id}/photos`)} className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-2">
                <Camera className="h-5 w-5 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{clientDisplayName(clients.find((c) => c.id === p.clientId))}</span>
                  <span className="block truncate text-sm text-muted">{projectTitle(p)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
