import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, MapPin, Navigation, XCircle } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { fullDateTime, money, num } from '@/lib/format';
import { ACTIVE_RIDE_STATUSES, CANCELLED_BY, RIDE_CLASS, RIDE_STATUS } from '@/lib/labels';
import type { Ride } from '@/lib/types';
import { Drawer } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { DefinitionList, PageLoader } from '@/components/ui/Misc';
import { PartyCell } from '@/components/ui/PartyCell';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

const TIMELINE: { status: string; label: string }[] = [
  { status: 'PENDING', label: 'Demandée' },
  { status: 'ACCEPTED', label: 'Acceptée' },
  { status: 'ARRIVED', label: 'Capitaine sur place' },
  { status: 'IN_PROGRESS', label: 'En cours' },
  { status: 'COMPLETED', label: 'Terminée' },
];

export function RideDrawer({ rideId, onClose }: { rideId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const { data: ride, isLoading, isError, error } = useQuery({
    queryKey: ['ride', rideId],
    queryFn: async () => (await api.get<Ride>(`/admin/rides/${rideId}`)).data,
    enabled: !!rideId,
    refetchInterval: (q) => (q.state.data && ACTIVE_RIDE_STATUSES.includes(q.state.data.status) ? 10_000 : false),
  });

  const cancel = useMutation({
    mutationFn: (reason: string) => api.post(`/admin/rides/${rideId}/cancel`, { reason: reason || undefined }),
    onSuccess: () => {
      toast.success('Course annulée — client et capitaine ont été prévenus');
      setCancelling(false);
      qc.invalidateQueries({ queryKey: ['ride', rideId] });
      qc.invalidateQueries({ queryKey: ['rides'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const canCancel = ride && ACTIVE_RIDE_STATUSES.includes(ride.status);
  const reachedIndex = ride ? TIMELINE.findIndex((t) => t.status === ride.status) : -1;

  return (
    <Drawer
      open={!!rideId}
      onClose={onClose}
      title={ride ? `Course ${ride.id.slice(0, 8)}` : 'Course'}
      subtitle={ride && <span className="inline-flex items-center gap-2"><StatusBadge map={RIDE_STATUS} value={ride.status} /> {fullDateTime(ride.createdAt)}</span>}
      footer={ride && (
        <>
          <Button variant="ghost" icon={<Copy className="h-4 w-4" />} onClick={() => navigator.clipboard?.writeText(ride.id).then(() => toast.success('Identifiant copié'))}>
            Copier l'ID
          </Button>
          {canCancel && <Button variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setCancelling(true)}>Annuler la course</Button>}
        </>
      )}
    >
      {isLoading ? <PageLoader /> : isError ? <p className="text-sm text-danger">{errorMessage(error)}</p> : ride && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Client</p>
              <PartyCell party={ride.user} fallbackId={ride.userId} type="user" />
            </div>
            <div className="rounded-xl border border-slate-100 p-3 dark:border-white/[0.06]">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Capitaine</p>
              {ride.driverId ? <PartyCell party={ride.driver} fallbackId={ride.driverId} type="driver" /> : <span className="text-sm text-slate-400">Pas encore attribuée</span>}
            </div>
          </div>

          <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
            <a href={mapsLink(num(ride.startLatitude), num(ride.startLongitude))} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:underline">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span className="text-sm">Départ · {num(ride.startLatitude).toFixed(5)}, {num(ride.startLongitude).toFixed(5)}</span>
            </a>
            {ride.isOpenTrip ? (
              <p className="flex items-start gap-3 text-sm"><Navigation className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" /> Trajet ouvert (destination libre, compteur temps réel)</p>
            ) : (
              <a href={ride.endLatitude ? mapsLink(num(ride.endLatitude), num(ride.endLongitude)) : undefined} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:underline">
                <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                <span className="text-sm">{ride.destinationName || 'Destination'}</span>
              </a>
            )}
          </div>

          {ride.status !== 'CANCELLED' && ride.status !== 'SCHEDULED' && (
            <ol className="flex items-center gap-1">
              {TIMELINE.map((t, i) => (
                <li key={t.status} className="flex flex-1 flex-col gap-1.5">
                  <span className={`h-1.5 rounded-full ${i <= reachedIndex ? 'bg-accent-500' : 'bg-slate-200 dark:bg-white/10'}`} />
                  <span className={`text-[10px] ${i <= reachedIndex ? 'font-medium text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>{t.label}</span>
                </li>
              ))}
            </ol>
          )}

          {ride.status === 'CANCELLED' && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">
              Annulée par {CANCELLED_BY[ride.cancelledBy ?? ''] ?? 'inconnu'}{ride.cancelReason ? ` — « ${ride.cancelReason} »` : ''}
            </div>
          )}

          <DefinitionList items={[
            { label: 'Classe', value: RIDE_CLASS[ride.vehicleType] ?? ride.vehicleType },
            { label: 'Prix final', value: ride.price ? money(ride.price) : '—' },
            { label: 'Estimation', value: ride.estimatedPrice ? money(ride.estimatedPrice) : '—' },
            ...(ride.isOpenTrip ? [
              { label: 'Distance parcourue', value: `${num(ride.traveledDistanceKm).toFixed(2)} km` },
              { label: 'Temps d\'arrêt', value: `${Math.round(ride.stoppedSeconds / 60)} min` },
              { label: 'Compteur', value: ride.livePrice ? money(ride.livePrice) : '—' },
            ] : []),
            ...(ride.couponCode ? [{ label: 'Coupon', value: `${ride.couponCode} (−${money(ride.discountAmount)})` }] : []),
            ...(ride.scheduledAt ? [{ label: 'Programmée pour', value: fullDateTime(ride.scheduledAt) }] : []),
            { label: 'Démarrée', value: fullDateTime(ride.startedAt) },
            { label: 'Note du capitaine', value: ride.ratingForDriver ? `${num(ride.ratingForDriver)} / 5` : '—' },
            { label: 'Note du client', value: ride.ratingForRider ? `${num(ride.ratingForRider)} / 5` : '—' },
            { label: 'Capitaines notifiés', value: ride.notifiedDriverIds.length },
            { label: 'Refus', value: ride.rejectedDriverIds.length },
          ]} />
        </div>
      )}

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={(reason) => cancel.mutate(reason)}
        loading={cancel.isPending}
        title="Annuler cette course ?"
        description="Le client et le capitaine sont prévenus immédiatement et le capitaine redevient disponible. Aucune commission n'est prélevée."
        confirmLabel="Annuler la course"
        reason={{ label: 'Motif', placeholder: 'Ex. capitaine injoignable', suggestions: ['Capitaine injoignable', 'Course bloquée', 'Demande du client', 'Litige'] }}
      />
    </Drawer>
  );
}
