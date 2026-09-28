import { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { ArrowRight, Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useProjectData, forgetPhotoUrls } from '../../hooks/useData';
import { PageHeader, StickyActions } from '../../components/ui/PageHeader';
import { Badge, Card, CardTitle } from '../../components/ui/Card';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Checkbox, Chip, SelectField, TextField } from '../../components/ui/Form';
import { Alert, Dialog, EmptyState, useToast } from '../../components/ui/Feedback';
import { PhotoThumb } from '../../components/PhotoThumb';
import { NotFoundPage } from '../NotFoundPage';
import { QuoteFlowBar } from '../../components/QuoteFlowBar';
import { BeforeAfterSlider } from '../../components/BeforeAfter';
import { addPhotos, deletePhoto, updatePhoto } from '../../features/projects/actions';
import { updateQuote } from '../../features/quotes/actions';
import { PHOTO_TAGS, photoTagLabel } from '../../features/projects/status';
import { clientDisplayName } from '../../features/clients/format';
import type { PhotoMeta, PhotoTag } from '../../types';

const MAX_IN_QUOTE = 8;

export function PhotosPage() {
  const { id } = useParams();
  const { project, quote, client, photos } = useProjectData(id);
  const toast = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [tag, setTag] = useState<PhotoTag>('before');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!project) return <NotFoundPage />;

  const onFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setBusy(true);
    const ids = await addPhotos(project.id, files, tag);
    setBusy(false);
    if (ids.length === 0) {
      toast('Impossible d’ajouter cette image. Essayez une photo au format JPEG ou PNG.', 'danger');
      return;
    }
    // Les premières photos « avant / vue générale » sont proposées dans le devis (modifiable).
    if (quote && tag !== 'during' && tag !== 'after') {
      const room = MAX_IN_QUOTE - quote.includedPhotoIds.length;
      if (room > 0) updateQuote(quote.id, { includedPhotoIds: [...quote.includedPhotoIds, ...ids.slice(0, Math.min(room, 4))] });
    }
    toast(ids.length > 1 ? `${ids.length} photos ajoutées.` : 'Photo ajoutée.');
  };

  const open = photos.find((p) => p.id === openId);
  const firstBefore = photos.find((p) => p.tag === 'before' || p.tag === 'overview');
  const lastAfter = [...photos].reverse().find((p) => p.tag === 'after');
  const beforeAfter = firstBefore && lastAfter ? { before: firstBefore.id, after: lastAfter.id } : null;
  const groups: { title: string; tags: PhotoTag[] }[] = [
    { title: 'Avant / état des lieux', tags: ['before', 'overview', 'zone', 'detail'] },
    { title: 'Pendant les travaux', tags: ['during'] },
    { title: 'Après', tags: ['after'] },
  ];

  return (
    <div className="space-y-5">
      <PageHeader back={`/projects/${project.id}`} title="Photos du chantier" subtitle={clientDisplayName(client)} />
      <QuoteFlowBar current="site" projectId={project.id} quote={quote} />

      <Card>
        <p className="mb-2 text-sm font-medium">Type des prochaines photos</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {PHOTO_TAGS.map((t) => (
            <Chip key={t.value} selected={tag === t.value} onClick={() => setTag(t.value)}>
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" disabled={busy} onClick={() => cameraRef.current?.click()} icon={busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}>
            {busy ? 'Enregistrement…' : 'Prendre une photo'}
          </Button>
          <Button size="lg" variant="secondary" disabled={busy} onClick={() => importRef.current?.click()} icon={<ImagePlus className="h-6 w-6" />}>
            Importer des photos
          </Button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={importRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="mt-3 text-xs text-muted">Les photos sont compressées et restent sur cet appareil. Elles ne sont envoyées nulle part.</p>
      </Card>

      {photos.length === 0 ? (
        <EmptyState icon={<Camera className="h-7 w-7" />} title="Aucune photo">
          Prenez quelques photos : vue générale, zones concernées, éléments particuliers.
        </EmptyState>
      ) : (
        groups.map((g) => {
          const list = photos.filter((p) => g.tags.includes(p.tag));
          if (!list.length) return null;
          return (
            <Card key={g.title}>
              <CardTitle>
                {g.title} <span className="font-normal text-muted">({list.length})</span>
              </CardTitle>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {list.map((p) => (
                  <PhotoTile key={p.id} photo={p} inQuote={!!quote?.includedPhotoIds.includes(p.id)} onOpen={() => setOpenId(p.id)} />
                ))}
              </div>
            </Card>
          );
        })
      )}

      {beforeAfter && (
        <Card>
          <CardTitle>Avant / après</CardTitle>
          <BeforeAfterSlider beforeId={beforeAfter.before} afterId={beforeAfter.after} />
        </Card>
      )}

      <StickyActions>
        <ButtonLink to={`/projects/${project.id}/measures`} block size="lg" icon={<ArrowRight className="h-5 w-5" />}>
          Continuer : Mesures
        </ButtonLink>
      </StickyActions>

      {open && (
        <PhotoDialog
          photo={open}
          inQuote={!!quote?.includedPhotoIds.includes(open.id)}
          canAddToQuote={(quote?.includedPhotoIds.length ?? 0) < MAX_IN_QUOTE}
          onToggleQuote={(v) => {
            if (!quote) return;
            updateQuote(quote.id, {
              includedPhotoIds: v ? [...quote.includedPhotoIds, open.id] : quote.includedPhotoIds.filter((x) => x !== open.id),
            });
          }}
          onClose={() => setOpenId(null)}
          onDelete={async () => {
            setOpenId(null);
            await deletePhoto(open.id);
            forgetPhotoUrls(open.id);
            toast('Photo supprimée.');
          }}
        />
      )}
    </div>
  );
}

function PhotoTile({ photo, inQuote, onOpen }: { photo: PhotoMeta; inQuote: boolean; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group relative overflow-hidden rounded-xl text-left" aria-label={`Ouvrir la photo ${photo.caption || photoTagLabel(photo.tag)}`}>
      <PhotoThumb photoId={photo.id} alt={photo.caption || photoTagLabel(photo.tag)} className="aspect-square w-full transition-transform group-hover:scale-[1.02]" />
      <span className="absolute left-1.5 top-1.5">
        <Badge>{photoTagLabel(photo.tag)}</Badge>
      </span>
      {inQuote && (
        <span className="absolute right-1.5 top-1.5">
          <Badge tone="success">Devis</Badge>
        </span>
      )}
      {photo.caption && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-xs text-white">{photo.caption}</span>
      )}
    </button>
  );
}

function PhotoDialog({
  photo,
  inQuote,
  canAddToQuote,
  onToggleQuote,
  onClose,
  onDelete,
}: {
  photo: PhotoMeta;
  inQuote: boolean;
  canAddToQuote: boolean;
  onToggleQuote: (v: boolean) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [caption, setCaption] = useState(photo.caption);
  return (
    <Dialog
      open
      onClose={() => {
        if (caption !== photo.caption) void updatePhoto(photo.id, { caption: caption.trim() });
        onClose();
      }}
      title="Photo"
      footer={
        <>
          <Button variant="danger" onClick={onDelete} icon={<Trash2 className="h-4 w-4" />}>
            Supprimer
          </Button>
          <Button
            onClick={() => {
              void updatePhoto(photo.id, { caption: caption.trim() });
              onClose();
            }}
          >
            Enregistrer
          </Button>
        </>
      }
    >
      <PhotoThumb photoId={photo.id} quality="medium" alt={photo.caption || 'Photo du chantier'} className="mb-4 max-h-[45vh] w-full rounded-xl object-contain!" />
      <div className="space-y-3">
        <TextField label="Description" value={caption} onChange={setCaption} placeholder="Ex. Haie à tailler côté rue" />
        <SelectField
          label="Type"
          value={photo.tag}
          onChange={(v) => void updatePhoto(photo.id, { tag: v as PhotoTag })}
          options={PHOTO_TAGS.map((t) => ({ value: t.value, label: t.label }))}
        />
        <Checkbox checked={inQuote} onChange={(v) => (v && !canAddToQuote ? undefined : onToggleQuote(v))}>
          Afficher cette photo dans le devis
        </Checkbox>
        {!inQuote && !canAddToQuote && <Alert tone="info">Le devis contient déjà {MAX_IN_QUOTE} photos (maximum).</Alert>}
      </div>
    </Dialog>
  );
}
