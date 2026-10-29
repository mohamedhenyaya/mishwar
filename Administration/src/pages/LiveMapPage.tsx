import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { num, relative } from '@/lib/format';
import { DRIVER_STATUS, VEHICLE_TYPE } from '@/lib/labels';
import type { Driver } from '@/lib/types';
import { PageHeader } from '@/components/ui/Misc';
import { Input } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';

// Nouakchott — centre par défaut quand aucun capitaine n'est connecté
const DEFAULT_CENTER: [number, number] = [18.0858, -15.9785];
// Position plus ancienne que ce délai : le capitaine a probablement perdu le réseau
const STALE_AFTER_MS = 5 * 60 * 1000;

function markerIcon(status: Driver['status'], stale: boolean, selected: boolean) {
  const color = stale ? '#94a3b8' : status === 'BUSY' ? '#3652E0' : '#1FAA59';
  const size = selected ? 40 : 32;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
      <svg width="${size * 0.45}" height="${size * 0.45}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H8.3a2 2 0 0 0-1.6.8L4 9.5 2.5 11.1C1.7 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
    </div>`,
  });
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo(target, 15, { duration: 0.8 }); }, [target, map]);
  return null;
}

function FitAll({ points, enabled }: { points: [number, number][]; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    // Cadrage initial uniquement : les rafraîchissements ne doivent pas déplacer la carte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return null;
}

export default function LiveMapPage() {
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get('focus'));
  const [filter, setFilter] = useState<'all' | 'ONLINE' | 'BUSY'>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, dataUpdatedAt } = useQuery({
    queryKey: ['drivers', 'live'],
    queryFn: async () => (await api.get<Driver[]>('/admin/drivers/live')).data,
    refetchInterval: 10_000,
  });

  const drivers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? [])
      .filter((d) => filter === 'all' || d.status === filter)
      .filter((d) => !q || [d.name, d.phone, d.vehiclePlate].some((v) => v?.toLowerCase().includes(q)));
  }, [data, filter, search]);

  const points = drivers.map((d) => [num(d.latitude), num(d.longitude)] as [number, number]);
  const selectedDriver = data?.find((d) => d.id === selected);
  const target = selectedDriver ? [num(selectedDriver.latitude), num(selectedDriver.longitude)] as [number, number] : null;
  const counts = { ONLINE: data?.filter((d) => d.status === 'ONLINE').length ?? 0, BUSY: data?.filter((d) => d.status === 'BUSY').length ?? 0 };

  return (
    <>
      <PageHeader
        title="Carte en direct"
        description={dataUpdatedAt ? `Actualisée automatiquement · ${new Date(dataUpdatedAt).toLocaleTimeString('fr-FR')}` : 'Positions des capitaines connectés'}
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card flex max-h-[70vh] flex-col overflow-hidden lg:max-h-[calc(100vh-200px)]">
          <div className="space-y-3 border-b border-slate-100 p-3 dark:border-white/[0.06]">
            <Input leading={<Search className="h-4 w-4" />} placeholder="Nom, téléphone, plaque" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs dark:bg-white/[0.04]">
              {([['all', `Tous ${data?.length ?? 0}`], ['ONLINE', `Libres ${counts.ONLINE}`], ['BUSY', `En course ${counts.BUSY}`]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={clsx('rounded-lg py-1.5 font-medium', filter === v ? 'bg-white shadow-sm dark:bg-white/10' : 'text-slate-500')}>{l}</button>
              ))}
            </div>
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-white/[0.05]">
            {isError && <li className="p-4 text-sm text-danger">{errorMessage(error)}</li>}
            {!isLoading && drivers.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Aucun capitaine connecté</li>}
            {drivers.map((d) => {
              const stale = !d.lastLocationUpdate || Date.now() - new Date(d.lastLocationUpdate).getTime() > STALE_AFTER_MS;
              return (
                <li key={d.id}>
                  <button onClick={() => setSelected(d.id)}
                    className={clsx('flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]', selected === d.id && 'bg-accent-50/60 dark:bg-accent-500/10')}>
                    <Avatar name={d.name} photoUrl={d.photoUrl} seed={d.id} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{d.name || d.phone}</span>
                      <span className={clsx('block truncate text-xs', stale ? 'text-amber-600' : 'text-slate-500')}>
                        {d.vehiclePlate || VEHICLE_TYPE[d.vehicleType]} · {stale ? 'signal perdu ' : ''}{relative(d.lastLocationUpdate)}
                      </span>
                    </span>
                    <StatusBadge map={DRIVER_STATUS} value={d.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card relative h-[60vh] overflow-hidden lg:h-[calc(100vh-200px)]">
          <MapContainer center={DEFAULT_CENTER} zoom={12} className="h-full w-full" zoomControl>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitAll points={points} enabled={!!data && !selected} />
            <FlyTo target={target} />
            {drivers.map((d) => {
              const stale = !d.lastLocationUpdate || Date.now() - new Date(d.lastLocationUpdate).getTime() > STALE_AFTER_MS;
              return (
                <Marker key={d.id} position={[num(d.latitude), num(d.longitude)]} icon={markerIcon(d.status, stale, selected === d.id)}
                  eventHandlers={{ click: () => setSelected(d.id) }}>
                  <Popup>
                    <div className="min-w-[180px] space-y-1 font-sans">
                      <p className="font-semibold">{d.name || 'Sans nom'}</p>
                      <p className="text-xs">{d.phone}</p>
                      <p className="text-xs">{d.vehicleModel || VEHICLE_TYPE[d.vehicleType]} {d.vehiclePlate && `· ${d.vehiclePlate}`}</p>
                      <p className="text-xs text-slate-500">{DRIVER_STATUS[d.status].label} · GPS {relative(d.lastLocationUpdate)}</p>
                      <Link to={`/capitaines/${d.id}`} className="text-xs font-medium text-accent-600">Ouvrir la fiche →</Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
          <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex gap-3 rounded-xl bg-white/90 px-3 py-2 text-xs shadow-card backdrop-blur dark:bg-[#13131F]/90">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Disponible</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent-500" />En course</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />Signal perdu</span>
          </div>
        </div>
      </div>
    </>
  );
}
