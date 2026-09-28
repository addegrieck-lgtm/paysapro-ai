import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Card, CardTitle } from './ui/Card';
import { updateProject } from '../features/projects/actions';

/** Notes internes du chantier : jamais visibles par le client (ni page client, ni PDF). */
export function PrivateNotes({ projectId, value }: { projectId: string; value: string }) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }
  return (
    <Card>
      <CardTitle icon={<Lock className="h-4 w-4" />}>Notes internes</CardTitle>
      <label className="sr-only" htmlFor={`notes-${projectId}`}>
        Notes internes (jamais visibles par le client)
      </label>
      <textarea
        id={`notes-${projectId}`}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== value && updateProject(projectId, { privateNotes: text })}
        placeholder="Accès, matériel à prévoir, remarques… Jamais visibles par le client."
        className="w-full min-h-12 rounded-xl border border-line bg-surface px-3.5 py-2.5 leading-relaxed focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
      <p className="mt-1 text-xs text-muted">🔒 Visibles uniquement par vous : elles n’apparaissent ni sur le devis, ni sur la page client.</p>
    </Card>
  );
}
