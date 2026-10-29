import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Star } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useUrlFilters } from '@/lib/hooks';
import { dateTime } from '@/lib/format';
import type { Paginated, Review } from '@/lib/types';
import { PageHeader, Toolbar } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';
import { RideDrawer } from '@/components/rides/RideDrawer';

const LIMIT = 20;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-3.5 w-3.5 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />)}
    </span>
  );
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const { values, page, set } = useUrlFilters({ stars: '', targetType: '', isHidden: '' });
  const [rideId, setRideId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['reviews', values, page],
    queryFn: async () => (await api.get<Paginated<Review>>('/admin/reviews', {
      params: {
        page, limit: LIMIT,
        stars: values.stars || undefined, targetType: values.targetType || undefined, isHidden: values.isHidden || undefined,
      },
    })).data,
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (r: Review) => api.patch(`/admin/reviews/${r.id}/${r.isHidden ? 'unhide' : 'hide'}`),
    onSuccess: (_, r) => { toast.success(r.isHidden ? 'Avis réaffiché' : 'Avis masqué'); qc.invalidateQueries({ queryKey: ['reviews'] }); },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const columns: Column<Review>[] = [
    { key: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap text-slate-500">{dateTime(r.createdAt)}</span> },
    { key: 'rater', header: 'Auteur', cell: (r) => <PartyCell party={r.rater} fallbackId={r.raterId} type={r.raterType} /> },
    { key: 'target', header: 'Concerne', cell: (r) => <PartyCell party={r.target} fallbackId={r.targetId} type={r.targetType} /> },
    { key: 'stars', header: 'Note', cell: (r) => <Stars value={r.stars} /> },
    {
      key: 'comment', header: 'Commentaire', cell: (r) => (
        <div className="max-w-[320px]">
          <p className={`line-clamp-2 ${r.isHidden ? 'text-slate-400 line-through' : ''}`}>{r.comment || <span className="text-slate-400">—</span>}</p>
          <button onClick={() => setRideId(r.rideId)} className="text-xs text-accent-600 hover:underline dark:text-accent-300">Voir la course</button>
        </div>
      ),
    },
    {
      key: 'actions', header: '', className: 'text-right', cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.isHidden && <Badge>Masqué</Badge>}
          <Button size="sm" variant="outline" icon={r.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            onClick={() => toggle.mutate(r)} disabled={toggle.isPending && toggle.variables?.id === r.id}>
            {r.isHidden ? 'Réafficher' : 'Masquer'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Avis" description="Modération des notes et commentaires laissés après les courses" />
      <Toolbar>
        <Select className="sm:w-40" value={values.stars} onChange={(e) => set({ stars: e.target.value })}>
          <option value="">Toutes les notes</option>
          {[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s} étoile{s > 1 ? 's' : ''}</option>)}
        </Select>
        <Select className="sm:w-48" value={values.targetType} onChange={(e) => set({ targetType: e.target.value })}>
          <option value="">Clients et capitaines</option>
          <option value="driver">Avis sur des capitaines</option>
          <option value="user">Avis sur des clients</option>
        </Select>
        <Select className="sm:w-40" value={values.isHidden} onChange={(e) => set({ isHidden: e.target.value })}>
          <option value="">Visibles et masqués</option>
          <option value="false">Visibles</option>
          <option value="true">Masqués</option>
        </Select>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        empty={<EmptyState title="Aucun avis" />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
      <RideDrawer rideId={rideId} onClose={() => setRideId(null)} />
    </>
  );
}
