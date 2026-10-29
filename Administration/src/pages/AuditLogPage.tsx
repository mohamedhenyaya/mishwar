import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useUrlFilters } from '@/lib/hooks';
import { dayEndIso, dayStartIso, fullDateTime, money } from '@/lib/format';
import { AUDIT_ACTION, AUDIT_ACTION_GROUPS } from '@/lib/labels';
import type { AuditLog, Paginated, User } from '@/lib/types';
import { PageHeader, Toolbar } from '@/components/ui/Misc';
import { Input, Select } from '@/components/ui/Field';
import { Column, DataTable, EmptyState, Pagination } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { PartyCell } from '@/components/ui/PartyCell';

const LIMIT = 30;

function actionTone(action: string) {
  if (/block|delete|reject|deactivate|cancel|hide|debit/i.test(action)) return 'red' as const;
  if (/create|approve|unblock|unhide/i.test(action)) return 'green' as const;
  if (action.startsWith('wallet')) return 'violet' as const;
  return 'blue' as const;
}

// Détails lisibles selon l'action (montants, motifs…)
function details(log: AuditLog) {
  const m = log.metadata ?? {};
  const parts: string[] = [];
  if (typeof m.amount === 'number') parts.push(money(m.amount, { sign: true }));
  for (const key of ['reason', 'note', 'reviewNote'] as const) {
    if (typeof m[key] === 'string' && m[key]) parts.push(`« ${m[key]} »`);
  }
  if (typeof m.phone === 'string') parts.push(m.phone);
  if (parts.length === 0 && Object.keys(m).length) {
    parts.push(Object.entries(m).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' · '));
  }
  return parts.join(' · ');
}

export default function AuditLogPage() {
  const { values, page, set } = useUrlFilters({ action: '', adminId: '', from: '', to: '' });

  const admins = useQuery({
    queryKey: ['admins', 'all'],
    queryFn: async () => (await api.get<Paginated<User>>('/admin/users', { params: { role: 'admin', limit: 100 } })).data,
  });

  const query = useQuery({
    queryKey: ['audit', values, page],
    queryFn: async () => (await api.get<Paginated<AuditLog>>('/admin/audit-logs', {
      params: {
        page, limit: LIMIT,
        action: values.action || undefined,
        adminId: values.adminId || undefined,
        from: values.from ? dayStartIso(values.from) : undefined,
        to: values.to ? dayEndIso(values.to) : undefined,
      },
    })).data,
    placeholderData: keepPreviousData,
  });

  const columns: Column<AuditLog>[] = [
    { key: 'date', header: 'Date', cell: (l) => <span className="whitespace-nowrap text-slate-500">{fullDateTime(l.createdAt)}</span> },
    { key: 'admin', header: 'Administrateur', cell: (l) => <PartyCell party={l.admin} fallbackId={l.adminId} type="user" compact /> },
    { key: 'action', header: 'Action', cell: (l) => <Badge tone={actionTone(l.action)}>{AUDIT_ACTION[l.action] ?? l.action}</Badge> },
    {
      key: 'target', header: 'Cible', cell: (l) => l.target
        ? <PartyCell party={l.target} type={l.target.type} compact />
        : <span className="text-xs text-slate-500">{l.targetType}{l.targetId ? ` · ${l.targetId.slice(0, 8)}` : ''}</span>,
    },
    { key: 'details', header: 'Détails', hideOnMobile: true, cell: (l) => <span className="block max-w-[340px] truncate text-slate-500" title={details(l)}>{details(l) || '—'}</span> },
  ];

  return (
    <>
      <PageHeader title="Journal d'audit" description="Toutes les actions effectuées par les administrateurs" />
      <Toolbar>
        <Select className="sm:w-56" value={values.action} onChange={(e) => set({ action: e.target.value })}>
          {AUDIT_ACTION_GROUPS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </Select>
        <Select className="sm:w-52" value={values.adminId} onChange={(e) => set({ adminId: e.target.value })}>
          <option value="">Tous les administrateurs</option>
          {admins.data?.data.map((a) => <option key={a.id} value={a.id}>{a.name || a.phone}</option>)}
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" className="sm:w-40" value={values.from} onChange={(e) => set({ from: e.target.value })} aria-label="Du" />
          <span className="text-slate-400">→</span>
          <Input type="date" className="sm:w-40" value={values.to} onChange={(e) => set({ to: e.target.value })} aria-label="Au" />
        </div>
      </Toolbar>
      <DataTable
        columns={columns}
        rows={query.data?.data}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => query.refetch()}
        empty={<EmptyState title="Aucune action enregistrée" />}
        footer={query.data && query.data.total > 0 && (
          <Pagination page={page} limit={LIMIT} total={query.data.total} fetching={query.isFetching} onChange={(p) => set({ page: p })} />
        )}
      />
    </>
  );
}
