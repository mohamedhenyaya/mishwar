import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ExternalLink, FileText, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useUrlFilters } from '@/lib/hooks';
import { date, dateTime } from '@/lib/format';
import { mediaUrl } from '@/lib/config';
import { APPROVAL_STATUS, DOCUMENT_TYPE, VEHICLE_TYPE } from '@/lib/labels';
import type { Paginated, Vehicle, VehicleDocument } from '@/lib/types';
import { DefinitionList, PageHeader, PageLoader, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';
import { Drawer } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const LIMIT = 20;

function isExpired(doc: VehicleDocument) {
  return !!doc.expiresAt && new Date(doc.expiresAt) < new Date();
}

function VehicleDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [rejectingDoc, setRejectingDoc] = useState<VehicleDocument | null>(null);

  const { data: v, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => (await api.get<Vehicle>(`/admin/vehicles/${id}`)).data,
    enabled: !!id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['vehicle', id] });
    qc.invalidateQueries({ queryKey: ['vehicles'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
  };

  const decide = useMutation({
    mutationFn: ({ approve, reason }: { approve: boolean; reason?: string }) =>
      api.patch(`/admin/vehicles/${id}/${approve ? 'approve' : 'reject'}`, approve ? {} : { reason }),
    onSuccess: (_, { approve }) => { toast.success(approve ? 'Véhicule approuvé' : 'Véhicule rejeté'); setRejecting(false); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const reviewDoc = useMutation({
    mutationFn: ({ docId, status, reviewNote }: { docId: string; status: 'APPROVED' | 'REJECTED'; reviewNote?: string }) =>
      api.patch(`/admin/vehicles/documents/${docId}/review`, { status, reviewNote }),
    onSuccess: () => { toast.success('Document examiné'); setRejectingDoc(null); refresh(); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const docs = v?.documents ?? [];
  const missing = (['REGISTRATION', 'INSURANCE', 'INSPECTION'] as const).filter((t) => !docs.some((d) => d.type === t));
  const unapprovedDocs = docs.filter((d) => d.status !== 'APPROVED').length;

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={v ? `${v.make} ${v.model}` : 'Véhicule'}
      subtitle={v && <span className="inline-flex items-center gap-2"><StatusBadge map={APPROVAL_STATUS} value={v.status} /> <span className="font-mono">{v.plateNumber}</span></span>}
      footer={v && (
        <>
          {v.status !== 'REJECTED' && <Button variant="outline" icon={<X className="h-4 w-4" />} onClick={() => setRejecting(true)}>Rejeter</Button>}
          {v.status !== 'APPROVED' && <Button variant="success" icon={<Check className="h-4 w-4" />} loading={decide.isPending} onClick={() => decide.mutate({ approve: true })}>Approuver</Button>}
        </>
      )}
    >
      {isLoading || !v ? <PageLoader /> : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Capitaine</p>
            <PartyCell party={v.driver} fallbackId={v.driverId} type="driver" />
          </div>

          <DefinitionList items={[
            { label: 'Type', value: VEHICLE_TYPE[v.type] ?? v.type },
            { label: 'Marque / modèle', value: `${v.make} ${v.model}` },
            { label: 'Année', value: v.year },
            { label: 'Couleur', value: v.color || '—' },
            { label: 'Places', value: v.capacity ?? '—' },
            { label: 'Véhicule actif', value: v.isActive ? 'Oui' : 'Non' },
            { label: 'Déclaré le', value: date(v.createdAt) },
            ...(v.rejectedReason ? [{ label: 'Motif de rejet', value: v.rejectedReason }] : []),
          ]} />

          <div>
            <h3 className="mb-3 text-sm font-semibold">Documents</h3>
            {missing.length > 0 && (
              <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Manquant : {missing.map((m) => DOCUMENT_TYPE[m]).join(', ')}
              </p>
            )}
            {v.status === 'PENDING' && unapprovedDocs > 0 && (
              <p className="mb-3 text-xs text-slate-500">{unapprovedDocs} document(s) non validé(s) — vérifiez-les avant d'approuver le véhicule.</p>
            )}
            <ul className="space-y-2">
              {docs.length === 0 && <li className="text-sm text-slate-500">Aucun document envoyé</li>}
              {docs.map((d) => (
                <li key={d.id} className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{DOCUMENT_TYPE[d.type]}</p>
                      <p className={`text-xs ${isExpired(d) ? 'font-medium text-danger' : 'text-slate-500'}`}>
                        {d.expiresAt ? `${isExpired(d) ? 'Expiré le' : 'Expire le'} ${date(d.expiresAt)}` : 'Sans date d\'expiration'}
                      </p>
                    </div>
                    <StatusBadge map={APPROVAL_STATUS} value={d.status} />
                  </div>
                  {d.reviewNote && <p className="mt-2 text-xs text-slate-500">« {d.reviewNote} »</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={mediaUrl(d.fileUrl) ?? d.fileUrl} target="_blank" rel="noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                      <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
                    </a>
                    {d.status !== 'APPROVED' && (
                      <Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} loading={reviewDoc.isPending}
                        onClick={() => reviewDoc.mutate({ docId: d.id, status: 'APPROVED' })}>Valider</Button>
                    )}
                    {d.status !== 'REJECTED' && (
                      <Button size="sm" variant="outline" icon={<X className="h-3.5 w-3.5" />} onClick={() => setRejectingDoc(d)}>Refuser</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={rejecting}
        onClose={() => setRejecting(false)}
        onConfirm={(reason) => decide.mutate({ approve: false, reason })}
        loading={decide.isPending}
        title="Rejeter ce véhicule ?"
        description="Le capitaine verra le motif et pourra corriger sa déclaration."
        confirmLabel="Rejeter"
        reason={{ label: 'Motif', required: true, suggestions: ['Photo de la carte grise illisible', 'Assurance expirée', 'Plaque ne correspond pas', 'Véhicule trop ancien'] }}
      />
      <ConfirmDialog
        open={!!rejectingDoc}
        onClose={() => setRejectingDoc(null)}
        onConfirm={(reviewNote) => rejectingDoc && reviewDoc.mutate({ docId: rejectingDoc.id, status: 'REJECTED', reviewNote })}
        loading={reviewDoc.isPending}
        title={`Refuser : ${rejectingDoc ? DOCUMENT_TYPE[rejectingDoc.type] : ''}`}
        confirmLabel="Refuser le document"
        reason={{ label: 'Motif', required: true, suggestions: ['Illisible', 'Expiré', 'Mauvais document', 'Nom ne correspond pas'] }}
      />
    </Drawer>
  );
}

export default function VehiclesPage() {
  const [params, setParams] = useSearchParams();
  const { values, page, set } = useUrlFilters({ status: 'PENDING' });
  const openId = params.get('open');
  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('open', id); else next.delete('open');
    setParams(next, { replace: true });
  };

  const query = useQuery({
    queryKey: ['vehicles', 'list', values, page],
    queryFn: async () => (await api.get<Paginated<Vehicle>>('/admin/vehicles', {
      params: { page, limit: LIMIT, status: values.status === 'ALL' ? undefined : values.status },
    })).data,
    placeholderData: keepPreviousData,
  });

  const columns: Column<Vehicle>[] = [
    {
      key: 'vehicle', header: 'Véhicule', cell: (v) => (
        <div>
          <p className="font-medium">{v.make} {v.model} <span className="text-slate-400">· {v.year}</span></p>
          <p className="font-mono text-xs text-slate-500">{v.plateNumber}{v.color ? ` · ${v.color}` : ''}</p>
        </div>
      ),
    },
    { key: 'driver', header: 'Capitaine', cell: (v) => <PartyCell party={v.driver} fallbackId={v.driverId} type="driver" /> },
    { key: 'type', header: 'Type', hideOnMobile: true, cell: (v) => VEHICLE_TYPE[v.type] ?? v.type },
    {
      key: 'status', header: 'Statut', cell: (v) => (
        <span className="inline-flex items-center gap-1.5"><StatusBadge map={APPROVAL_STATUS} value={v.status} />{v.isActive && <Badge tone="blue">Actif</Badge>}</span>
      ),
    },
    { key: 'date', header: 'Déclaré le', hideOnMobile: true, cell: (v) => <span className="text-slate-500">{dateTime(v.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Véhicules" description="Validation des véhicules et des documents déclarés par les capitaines" />
      <Toolbar>
        <Select className="sm:w-48" value={values.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="PENDING">À valider</option>
          <option value="APPROVED">Approuvés</option>
          <option value="REJECTED">Rejetés</option>
          <option value="ALL">Tous</option>
        </Select>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        onRowClick={(v) => setOpen(v.id)}
        empty={<EmptyState title={values.status === 'PENDING' ? 'Aucun véhicule en attente' : 'Aucun véhicule'} />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      <VehicleDrawer id={openId} onClose={() => setOpen(null)} />
    </>
  );
}
