import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Badge, Card, ErrorNote, Input, PageHeader, Select, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, ROLE_LABEL } from '@/lib/format';
import type { AdminUser, Role } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const ROLE_COLOR: Record<Role, string> = { CITIZEN: '#e9e9e4', AGENT: '#0e0e0e', ADMIN: '#ffd400' };

/** Gestion des rôles : un administrateur nomme les agents de la ville. */
export default function UsersPage() {
  const { me } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const users = useApi<AdminUser[]>(me?.role === 'ADMIN' ? `/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}` : null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  if (me?.role !== 'ADMIN') return <Navigate to="/admin" replace />;

  async function changeRole(user: AdminUser, role: Role) {
    try {
      await api(`/admin/users/${user.id}/role`, { method: 'PATCH', json: { role } });
      toast('success', `${user.name} est maintenant ${ROLE_LABEL[role].toLowerCase()}`);
      void users.reload();
    } catch (e) {
      toast('error', errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Utilisateurs"
        subtitle="Un changement de rôle s’applique immédiatement : un agent rétrogradé perd l’accès sans attendre, et ses signalements redeviennent libres."
      />
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher : nom ou e-mail…" className="max-w-sm" aria-label="Rechercher un utilisateur" />
      {users.error && <ErrorNote>{users.error}</ErrorNote>}
      {users.loading && !users.data ? (
        <Spinner />
      ) : (
        <Card className="divide-y-2 divide-ink overflow-hidden">
          {users.data?.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate font-bold">
                  {u.name} {u.id === me.id && <span className="font-normal text-faint">(vous)</span>}
                </p>
                <p className="truncate text-[13px] text-muted">
                  {u.email} · inscrit le {formatDate(u.createdAt)} · {u._count.reports} signalement(s)
                </p>
              </div>
              {u.id === me.id ? (
                <Badge color={ROLE_COLOR[u.role]}>{ROLE_LABEL[u.role]}</Badge>
              ) : (
                <Select value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)} className="h-9 w-48 text-sm" aria-label={`Rôle de ${u.name}`}>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
