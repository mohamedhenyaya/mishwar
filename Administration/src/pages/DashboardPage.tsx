import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowRight, Ban, Car, CarFront, CircleDollarSign, LifeBuoy, Percent, Route, Users, Wallet,
} from 'lucide-react';
import { api } from '@/lib/api';
import { chartColors, useTheme } from '@/lib/theme';
import { compact, int, money, relative } from '@/lib/format';
import { RIDE_STATUS } from '@/lib/labels';
import type { Paginated, Ride, TimeseriesPoint } from '@/lib/types';
import { useOverview } from '@/components/layout/Layout';
import { Card, PageHeader, StatCard, Tabs } from '@/components/ui/Misc';
import { StatusBadge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';
import { Spinner } from '@/components/ui/Misc';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#1FAA59', CANCELLED: '#E5484D', IN_PROGRESS: '#3652E0', ACCEPTED: '#6F86FF',
  ARRIVED: '#8FA0F7', PENDING: '#F5A524', SCHEDULED: '#8B5CF6',
};

function dayLabel(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const c = chartColors(theme);
  const [days, setDays] = useState<'7' | '30' | '90'>('30');

  const overview = useOverview();
  const series = useQuery({
    queryKey: ['timeseries', days],
    queryFn: async () => (await api.get<TimeseriesPoint[]>('/admin/dashboard/timeseries', { params: { days } })).data,
  });
  const recent = useQuery({
    queryKey: ['rides', 'recent'],
    queryFn: async () => (await api.get<Paginated<Ride>>('/admin/rides', { params: { limit: 6 } })).data,
    refetchInterval: 30_000,
  });

  const o = overview.data;
  const totals = (series.data ?? []).reduce(
    (acc, p) => ({ rides: acc.rides + p.rides, revenue: acc.revenue + p.revenue, commission: acc.commission + p.commission, signups: acc.signups + p.signups }),
    { rides: 0, revenue: 0, commission: 0, signups: 0 },
  );
  const statusData = Object.entries(o?.ridesByStatus ?? {}).map(([k, v]) => ({ name: RIDE_STATUS[k]?.label ?? k, key: k, value: v }));
  const totalRides = statusData.reduce((s, d) => s + d.value, 0);
  const completionRate = totalRides ? Math.round(((o?.ridesByStatus.COMPLETED ?? 0) / totalRides) * 100) : 0;

  const tooltipStyle = { background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 12, fontSize: 12 };

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité de la plateforme"
        actions={<Tabs value={days} onChange={setDays} tabs={[{ value: '7', label: '7 j' }, { value: '30', label: '30 j' }, { value: '90', label: '90 j' }]} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Courses aujourd'hui" value={o ? int(o.ridesToday) : '—'} hint={`${int(totals.rides)} sur ${days} jours`} icon={<Route className="h-5 w-5" />} to="/courses" />
        <StatCard label="Chiffre d'affaires" value={money(totals.revenue)} hint={`Total : ${o ? money(o.revenueTotal) : '—'}`} icon={<CircleDollarSign className="h-5 w-5" />} tone="green" />
        <StatCard label="Commissions perçues" value={money(totals.commission)} hint={`Total : ${o ? money(o.commissionTotal) : '—'}`} icon={<Percent className="h-5 w-5" />} tone="violet" />
        <StatCard label="Capitaines connectés" value={o ? `${int(o.onlineDrivers + o.busyDrivers)} / ${int(o.totalDrivers)}` : '—'}
          hint={o ? `${int(o.onlineDrivers)} disponibles · ${int(o.busyDrivers)} en course` : undefined} icon={<CarFront className="h-5 w-5" />} tone="amber" to="/carte" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Revenus & commissions" className="xl:col-span-2" bodyClassName="p-2 pt-4 sm:p-4">
          <div className="h-72">
            {series.isLoading ? <div className="flex h-full items-center justify-center"><Spinner /></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series.data} margin={{ left: 4, right: 12, top: 4 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3652E0" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#3652E0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="com" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis dataKey="day" tickFormatter={dayLabel} stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={compact} width={44} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} formatter={(v: number, n) => [money(v), n === 'revenue' ? 'Revenu' : 'Commission']} />
                  <Area type="monotone" dataKey="revenue" stroke="#3652E0" strokeWidth={2} fill="url(#rev)" />
                  <Area type="monotone" dataKey="commission" stroke="#8B5CF6" strokeWidth={2} fill="url(#com)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title="Répartition des courses" actions={<span className="text-xs text-slate-500">{completionRate}% terminées</span>}>
          {totalRides === 0 ? (
            <p className="py-20 text-center text-sm text-slate-500">Aucune course pour l'instant</p>
          ) : (
            <>
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                      {statusData.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key] ?? '#94a3b8'} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => int(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold">{compact(totalRides)}</span>
                  <span className="text-[11px] text-slate-500">courses</span>
                </div>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {statusData.map((d) => (
                  <li key={d.key} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[d.key] }} />
                    <span className="flex-1 truncate text-slate-500 dark:text-slate-400">{d.name}</span>
                    <span className="font-medium">{int(d.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Courses par jour" className="xl:col-span-2" bodyClassName="p-2 pt-4 sm:p-4">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.data} margin={{ left: 4, right: 12, top: 4 }}>
                <CartesianGrid stroke={c.grid} vertical={false} />
                <XAxis dataKey="day" tickFormatter={dayLabel} stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis stroke={c.axis} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} cursor={{ fill: c.grid }}
                  formatter={(v: number, n) => [int(v), n === 'completed' ? 'Terminées' : n === 'cancelled' ? 'Annulées' : 'Inscriptions']} />
                <Bar dataKey="completed" stackId="r" fill="#1FAA59" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cancelled" stackId="r" fill="#E5484D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="À traiter">
          <ul className="space-y-2">
            {[
              { to: '/portefeuille', icon: Wallet, label: 'Demandes de recharge / retrait', count: o?.pending.walletRequests },
              { to: '/capitaines?vehicleStatus=TO_REVIEW', icon: Car, label: 'Dossiers capitaines à traiter', count: o?.pending.vehicles },
              { to: '/support', icon: LifeBuoy, label: 'Tickets support ouverts', count: o?.pending.tickets },
              { to: '/capitaines?account=blocked', icon: Ban, label: 'Capitaines bloqués', count: o?.blockedDrivers },
              { to: '/clients?isActive=false', icon: Users, label: 'Clients bloqués', count: o?.blockedUsers },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
                  <item.icon className="h-4 w-4 text-slate-400" />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.count ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' : 'text-slate-400'}`}>
                    {item.count ?? '—'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-center dark:border-white/[0.06]">
            <div><p className="text-lg font-semibold">{o ? int(o.totalUsers) : '—'}</p><p className="text-xs text-slate-500">clients</p></div>
            <div><p className="text-lg font-semibold">{int(totals.signups)}</p><p className="text-xs text-slate-500">inscrits sur {days} j</p></div>
          </div>
        </Card>
      </div>

      <Card title="Dernières courses" className="mt-4" bodyClassName="p-0"
        actions={<Link to="/courses" className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-300">Tout voir</Link>}>
        <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {(recent.data?.data ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
              <div className="w-48 min-w-0"><PartyCell party={r.user} fallbackId={r.userId} type="user" /></div>
              <div className="hidden w-48 min-w-0 md:block">{r.driverId ? <PartyCell party={r.driver} fallbackId={r.driverId} type="driver" /> : <span className="text-sm text-slate-400">Sans capitaine</span>}</div>
              <p className="min-w-0 flex-1 truncate text-sm text-slate-500">{r.isOpenTrip ? 'Trajet ouvert' : r.destinationName || '—'}</p>
              <StatusBadge map={RIDE_STATUS} value={r.status} />
              <span className="w-24 text-right text-sm font-medium">{r.price ? money(r.price) : '—'}</span>
              <span className="w-24 text-right text-xs text-slate-400">{relative(r.createdAt)}</span>
            </li>
          ))}
          {recent.data && recent.data.data.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-500">Aucune course</li>}
        </ul>
      </Card>
    </>
  );
}
