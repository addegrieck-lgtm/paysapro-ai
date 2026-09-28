import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Database, Download, FlaskConical, Trash2, Upload } from 'lucide-react';
import { useAppState } from '../../lib/store';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Alert, ConfirmDialog, useToast } from '../../components/ui/Feedback';
import { clearAllData, exportData, importData, exitDemo, openDemo, resetDemo } from '../../features/settings/dataActions';
import { downloadBlob } from '../../lib/share';
import { storageEstimate } from '../../lib/pwa';
import { formatNumber } from '../../utils/number';

function mb(bytes: number) {
  return `${formatNumber(bytes / 1024 / 1024, 1)} Mo`;
}

export function DataPage() {
  const { clients, projects, quotes, photos, demo } = useAppState();
  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    void storageEstimate().then(setUsage);
  }, [photos.length]);

  return (
    <div className="space-y-5">
      <PageHeader back="/settings" title="Données" subtitle={demo ? "Espace de démonstration (données fictives)." : "Vos données sont stockées uniquement sur cet appareil."} />

      <Card>
        <CardTitle icon={<Database className="h-5 w-5" />}>Sur cet appareil</CardTitle>
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[
            ['Clients', clients.length],
            ['Chantiers', projects.length],
            ['Devis', quotes.filter((q) => q.number).length],
            ['Photos', photos.length],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-surface-2 p-3">
              <dt className="text-muted">{l}</dt>
              <dd className="text-lg font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {usage && usage.quota > 0 && (
          <p className="mt-3 text-sm text-muted">
            Espace utilisé : {mb(usage.used)} sur {mb(usage.quota)} disponibles.
          </p>
        )}
      </Card>

      <Alert tone="warning" title="Pensez à sauvegarder">
        Sans compte en ligne, vos données ne sont pas synchronisées. Exportez régulièrement une sauvegarde (par ex. chaque semaine) et gardez-la en lieu sûr (e-mail, cloud personnel).
      </Alert>

      <Card>
        <CardTitle>Sauvegarde</CardTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            icon={<Download className="h-5 w-5" />}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const { blob, fileName } = await exportData();
                downloadBlob(blob, fileName);
                toast('Sauvegarde exportée.');
              } catch {
                toast("L'export a échoué.", 'danger');
              } finally {
                setBusy(false);
              }
            }}
          >
            Télécharger une sauvegarde
          </Button>
          <Button variant="secondary" icon={<Upload className="h-5 w-5" />} onClick={() => fileRef.current?.click()}>
            Importer une sauvegarde
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            setPendingImport(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
        <p className="mt-2 text-sm text-muted">La sauvegarde contient clients, chantiers, devis, catalogue, réglages et photos.</p>
      </Card>

      <Card>
        <CardTitle icon={<FlaskConical className="h-5 w-5" />}>Démonstration</CardTitle>
        <p className="mb-3 text-sm text-muted">
          Un espace séparé avec une entreprise, des clients, des chantiers, des devis et des photos fictifs, pour montrer l’application à un prospect. Vos vraies données ne sont jamais modifiées.
        </p>
        {demo ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={async () => {
                await exitDemo();
                toast('✓ Retour à votre espace');
                navigate('/app');
              }}
            >
              Quitter la démo
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                await resetDemo();
                toast('✓ Démo réinitialisée');
              }}
            >
              Réinitialiser la démo
            </Button>
          </div>
        ) : (
          <Button
            variant="soft"
            block
            onClick={async () => {
              await openDemo();
              toast('Espace de démonstration ouvert.', 'info');
              navigate('/app');
            }}
          >
            Ouvrir l’espace de démonstration
          </Button>
        )}
      </Card>

      <Card className="border-danger/30">
        <CardTitle>Zone sensible</CardTitle>
        <Button variant="danger" block icon={<Trash2 className="h-5 w-5" />} onClick={() => setConfirmClear(true)}>
          Supprimer toutes mes données
        </Button>
      </Card>

      <ConfirmDialog
        open={!!pendingImport}
        title="Importer cette sauvegarde ?"
        message={
          <>
            <p>
              Fichier : <strong>{pendingImport?.name}</strong>
            </p>
            <p>Toutes les données actuelles de cet appareil seront remplacées par celles de la sauvegarde.</p>
          </>
        }
        confirmLabel="Importer et remplacer"
        danger
        onClose={() => setPendingImport(null)}
        onConfirm={async () => {
          const f = pendingImport;
          setPendingImport(null);
          if (!f) return;
          const res = await importData(f);
          if (res.ok) {
            toast('Sauvegarde importée.');
            navigate('/app');
          } else toast(res.error, 'danger');
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Supprimer toutes les données ?"
        message={
          <>
            <p>Clients, chantiers, devis, photos, catalogue et réglages seront définitivement effacés de cet appareil.</p>
            <p className="font-semibold text-danger">Cette action est irréversible. Exportez d’abord une sauvegarde si besoin.</p>
          </>
        }
        confirmLabel="Tout supprimer"
        requireText="SUPPRIMER"
        danger
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          setConfirmClear(false);
          await clearAllData();
          toast('Toutes les données ont été supprimées.');
          navigate('/onboarding', { replace: true });
        }}
      />
    </div>
  );
}
