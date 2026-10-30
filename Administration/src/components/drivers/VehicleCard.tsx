import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, FileText, ImageOff, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { toDataUrl } from '@/lib/files';
import { date, vehicleName } from '@/lib/format';
import { mediaUrl } from '@/lib/config';
import { APPROVAL_STATUS, DOCUMENT_TYPE, FUEL_TYPE } from '@/lib/labels';
import { REQUIRED_DOCUMENT_TYPES, type Paginated, type Vehicle, type VehicleDocument } from '@/lib/types';
import { Card, DefinitionList, PageLoader } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImageViewer } from '@/components/ui/ImageViewer';

// Les pièces ne sont jamais publiques : le fichier est lu avec le jeton admin puis affiché en blob
function DocumentImage({ doc, onOpen }: { doc: VehicleDocument; onOpen: (src: string) => void }) {
  // Image gardée en cache sous forme de data URL : rien à libérer, elle ne peut pas devenir
  // invalide au remontage de la carte (les adresses blob: libérées cassaient l'affichage)
  const { data: url, isLoading, isError } = useQuery({
    queryKey: ['document-file', doc.id],
    queryFn: async () => toDataUrl((await api.get<Blob>(`/admin/vehicles/documents/${doc.id}/file`, { responseType: 'blob' })).data),
    staleTime: Infinity,
  });
  const [unreadable, setUnreadable] = useState(false);

  const frame = 'flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5';
  if (isLoading) return <div className={`${frame} animate-pulse`} />;
  if (isError || !url) return <div className={frame}><ImageOff className="h-5 w-5 text-slate-400" /></div>;
  // Fichier reçu mais illisible par le navigateur (image corrompue) : téléchargement possible
  if (unreadable) {
    return (
      <div className={`${frame} flex-col gap-1 px-3 text-center text-xs text-slate-500`}>
        <ImageOff className="h-5 w-5 text-slate-400" />
        Image illisible.
        <span>Refusez la pièce pour demander une nouvelle photo, ou <a href={url} download className="font-medium text-accent-600 hover:underline dark:text-accent-300">téléchargez-la</a>.</span>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => onOpen(url)} className={`${frame} cursor-zoom-in`} title="Agrandir">
      <img src={url} alt={DOCUMENT_TYPE[doc.type]} className="h-full w-full object-cover" onError={() => setUnreadable(true)} />
    </button>
  );
}

// Un capitaine = un véhicule : son dossier (véhicule, photo, pièces) se valide depuis sa fiche.
// Approuver le dossier = approuver le compte ; l'assurance renouvelée se valide pièce par pièce.
export function VehicleCard({ driverId, photoUrl, readOnly = false }: { driverId: string; photoUrl: string | null; readOnly?: boolean }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<VehicleDocument | null>(null);
  // Pièce ou photo agrandie dans la page (pas de nouvel onglet), avec ses actions de vérification
  const [viewing, setViewing] = useState<{ src: string; title: string; docId?: string } | null>(null);

  const ref = useQuery({
    queryKey: ['vehicles', 'driver', driverId],
    queryFn: async () => (await api.get<Paginated<Vehicle>>('/admin/vehicles', { params: { driverId, limit: 1 } })).data.data[0] ?? null,
  });
  const id = ref.data?.id;
  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => (await api.get<Vehicle>(`/admin/vehicles/${id}`)).data,
    enabled: !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['vehicle', id] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
    qc.invalidateQueries({ queryKey: ['drivers'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
  };

  const decide = useMutation({
    mutationFn: ({ approve, reason }: { approve: boolean; reason?: string }) =>
      api.patch(`/admin/vehicles/${id}/${approve ? 'approve' : 'reject'}`, approve ? {} : { reason }),
    onSuccess: (_, { approve }) => {
      toast.success(approve ? 'Compte approuvé' : 'Dossier refusé');
      setRejecting(false); setConfirmingApproval(false); refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const reviewDoc = useMutation({
    mutationFn: ({ docId, status, reviewNote }: { docId: string; status: 'APPROVED' | 'REJECTED'; reviewNote?: string }) =>
      api.patch(`/admin/vehicles/documents/${docId}/review`, { status, reviewNote }),
    onSuccess: () => { toast.success('Document examiné'); setRejectingDoc(null); setViewing(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (ref.isLoading || (id && isLoading)) return <Card title="Dossier du capitaine"><PageLoader /></Card>;
  if (!v) return <Card title="Dossier du capitaine"><p className="text-sm text-slate-500">{ref.isError ? errorMessage(ref.error) : 'Véhicule introuvable'}</p></Card>;

  const docs = v.documents ?? [];
  const missing = v.missing ?? [];
  // Dernière version de chaque pièce requise, puis les autres documents (anciennes assurances, anciens types)
  const latest = REQUIRED_DOCUMENT_TYPES.map((t) => ({ type: t, doc: docs.find((d) => d.type === t) }));
  const others = docs.filter((d) => !latest.some((l) => l.doc?.id === d.id));
  const insuranceOk = !!v.insuranceValidUntil && new Date(v.insuranceValidUntil) >= new Date();
  // Pièces requises encore « En attente » : l'approbation du compte les validerait sans vérification
  const unreviewed = latest.filter((l) => l.doc?.status === 'PENDING').map((l) => DOCUMENT_TYPE[l.type] ?? l.type);

  const reviewButtons = (d: VehicleDocument) => (
    <>
      {d.status !== 'APPROVED' && (
        <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} loading={reviewDoc.isPending}
          onClick={() => reviewDoc.mutate({ docId: d.id, status: 'APPROVED' })}>Valider</Button>
      )}
      {d.status !== 'REJECTED' && (
        <Button size="sm" variant="outline" icon={<X className="h-3.5 w-3.5" />} onClick={() => setRejectingDoc(d)}>Refuser</Button>
      )}
    </>
  );
  const viewedDoc = viewing?.docId ? docs.find((d) => d.id === viewing.docId) : undefined;

  const renderDoc = (d: VehicleDocument) => (
    <div className="space-y-2">
      <DocumentImage doc={d} onOpen={(src) => setViewing({ src, title: DOCUMENT_TYPE[d.type] ?? d.type, docId: d.id })} />
      <div className="flex items-center justify-between gap-2">
        <StatusBadge map={APPROVAL_STATUS} value={d.status} />
        {d.expiresAt && <span className="text-xs text-slate-500">jusqu’au {date(d.expiresAt)}</span>}
      </div>
      {d.reviewNote && <p className="text-xs text-slate-500">« {d.reviewNote} »</p>}
      {!readOnly && <div className="flex flex-wrap gap-2">{reviewButtons(d)}</div>}
    </div>
  );

  return (
    <Card title="Dossier du capitaine" actions={<StatusBadge map={APPROVAL_STATUS} value={v.status} />}>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="w-28 shrink-0">
            <p className="mb-1 text-xs font-medium text-slate-500">Photo de profil</p>
            {photoUrl
              ? (
                <button type="button" className="cursor-zoom-in" title="Agrandir"
                  onClick={() => setViewing({ src: mediaUrl(photoUrl)!, title: 'Photo de profil' })}>
                  <img src={mediaUrl(photoUrl) ?? undefined} alt="Photo de profil" className="aspect-square w-28 rounded-xl object-cover" />
                </button>
              )
              : <div className="flex aspect-square w-28 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 dark:bg-white/5">Aucune</div>}
          </div>
          <div className="min-w-0 flex-1">
            <DefinitionList items={[
              { label: 'Prénom', value: v.identity?.firstName || <span className="text-danger">Non renseigné</span> },
              { label: 'Nom', value: v.identity?.lastName || <span className="text-danger">Non renseigné</span> },
              { label: 'NNI', value: v.identity?.nni ? <span className="font-mono">{v.identity.nni}</span> : <span className="text-danger">Non renseigné</span> },
              { label: 'Véhicule', value: vehicleName(v) || '—' },
              ...(v.year ? [{ label: 'Année', value: v.year }] : []),
              { label: 'Plaque', value: <span className="font-mono">{v.plateNumber}</span> },
              ...(v.fuelType ? [{ label: 'Énergie', value: FUEL_TYPE[v.fuelType] ?? v.fuelType }] : []),
              {
                label: 'Assurance',
                value: v.insuranceValidUntil
                  ? <span className={insuranceOk ? '' : 'font-medium text-danger'}>{insuranceOk ? 'Valable' : 'Expirée'} jusqu’au {date(v.insuranceValidUntil)}</span>
                  : <span className="font-medium text-danger">Aucune assurance validée</span>,
              },
              ...(v.rejectedReason ? [{ label: 'Motif du refus', value: v.rejectedReason }] : []),
            ]} />
          </div>
        </div>

        {missing.length > 0 && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            À fournir par le capitaine : {missing.map((m) => DOCUMENT_TYPE[m] ?? m).join(', ')}
          </p>
        )}

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {v.status !== 'APPROVED' && (
              <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} loading={decide.isPending}
                disabled={missing.length > 0}
                onClick={() => (unreviewed.length ? setConfirmingApproval(true) : decide.mutate({ approve: true }))}>Approuver le compte</Button>
            )}
            {v.status !== 'REJECTED' && (
              <Button size="sm" variant="outline" icon={<X className="h-3.5 w-3.5" />} onClick={() => setRejecting(true)}>Refuser le dossier</Button>
            )}
            {v.status !== 'APPROVED' && missing.length === 0 && unreviewed.length > 0 && (
              <span className="text-xs text-amber-700 dark:text-amber-300">
                {unreviewed.length} pièce{unreviewed.length > 1 ? 's' : ''} pas encore vérifiée{unreviewed.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {latest.map(({ type, doc }) => (
            <div key={type} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
              <p className="mb-2 text-sm font-medium">{DOCUMENT_TYPE[type]}</p>
              {doc ? renderDoc(doc) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-white/10">
                  <FileText className="h-5 w-5" /> Non fourni
                </div>
              )}
            </div>
          ))}
        </div>

        {others.length > 0 && (
          <details>
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">Anciennes versions ({others.length})</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {others.map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                  <p className="mb-2 text-sm font-medium">{DOCUMENT_TYPE[d.type] ?? d.type} <span className="text-xs font-normal text-slate-400">· {date(d.createdAt)}</span></p>
                  {renderDoc(d)}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <ImageViewer
        src={viewing?.src ?? null}
        title={<>{viewing?.title}{viewedDoc?.expiresAt && <span className="ml-2 font-normal text-white/70">jusqu’au {date(viewedDoc.expiresAt)}</span>}</>}
        actions={viewedDoc && (
          <div className="flex items-center gap-2">
            <StatusBadge map={APPROVAL_STATUS} value={viewedDoc.status} />
            {!readOnly && reviewButtons(viewedDoc)}
          </div>
        )}
        onClose={() => setViewing(null)}
      />
      <ConfirmDialog
        open={confirmingApproval}
        onClose={() => setConfirmingApproval(false)}
        onConfirm={() => decide.mutate({ approve: true })}
        loading={decide.isPending}
        tone="primary"
        title="Approuver le compte sans tout vérifier ?"
        description={`${unreviewed.length > 1 ? 'Ces pièces n’ont pas encore été vérifiées' : 'Cette pièce n’a pas encore été vérifiée'}. En approuvant le compte, ${unreviewed.length > 1 ? 'elles seront validées' : 'elle sera validée'} automatiquement et le capitaine pourra passer en ligne.`}
        confirmLabel="Approuver quand même"
      >
        <ul className="list-disc space-y-0.5 pl-5 text-sm font-medium text-slate-700 dark:text-slate-200">
          {unreviewed.map((label) => <li key={label}>{label}</li>)}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Ouvrez chaque pièce pour la vérifier avant, si ce n’est pas déjà fait.</p>
      </ConfirmDialog>
      <ConfirmDialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        onConfirm={(reason) => decide.mutate({ approve: false, reason })}
        loading={decide.isPending}
        title="Refuser ce dossier ?"
        description="Le capitaine ne pourra pas passer en ligne. Il verra le motif et pourra renvoyer ses pièces depuis « Mon profil »."
        confirmLabel="Refuser"
        reason={{ label: 'Motif', required: true, suggestions: ['Photo de profil non conforme', 'Pièce d’identité illisible', 'Assurance expirée', 'Plaque ne correspond pas à la carte grise'] }}
      />
      <ConfirmDialog
        open={!!rejectingDoc}
        onClose={() => setRejectingDoc(null)}
        onConfirm={(reviewNote) => rejectingDoc && reviewDoc.mutate({ docId: rejectingDoc.id, status: 'REJECTED', reviewNote })}
        loading={reviewDoc.isPending}
        title={`Refuser : ${rejectingDoc ? DOCUMENT_TYPE[rejectingDoc.type] : ''}`}
        description="Le capitaine devra envoyer une nouvelle photo de cette pièce."
        confirmLabel="Refuser le document"
        reason={{ label: 'Motif', required: true, suggestions: ['Illisible', 'Expiré', 'Mauvais document', 'Nom ne correspond pas'] }}
      />
    </Card>
  );
}
