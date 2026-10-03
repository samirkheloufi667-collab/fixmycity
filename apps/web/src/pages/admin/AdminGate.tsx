import { Link, Navigate, NavLink, Outlet } from 'react-router';
import { buttonClass, EmptyState, Spinner } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { cx, isStaff } from '@/lib/format';

const tab = ({ isActive }: { isActive: boolean }) =>
  cx(
    'sign-wide border-2 border-ink px-3.5 py-2 text-[12px] whitespace-nowrap transition-colors',
    isActive ? 'bg-ink text-paper' : 'bg-card text-ink hover:bg-paper-2',
  );

/**
 * Accès à l'espace des services de la ville. L'interface filtre pour le
 * confort ; la vraie protection est côté API (RolesGuard vérifie le rôle en base).
 */
export default function AdminGate() {
  const { status, me } = useAuth();
  if (status === 'loading') return <Spinner />;
  if (!me) return <Navigate to="/connexion?next=/admin" replace />;
  if (!isStaff(me.role)) {
    return (
      <EmptyState
                title="Réservé aux services de la ville."
        text="Cette partie sert aux agents qui traitent les signalements. Essayez le compte de démonstration « Agent » pour la découvrir."
        action={
          <Link to="/carte" className={buttonClass('secondary')}>
            Retour à la carte
          </Link>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Espace ville">
        <NavLink to="/admin" end className={tab}>
          Tableau de bord
        </NavLink>
        <NavLink to="/admin/file" className={tab}>
          File de traitement
        </NavLink>
        {me.role === 'ADMIN' && (
          <NavLink to="/admin/utilisateurs" className={tab}>
            Utilisateurs
          </NavLink>
        )}
      </nav>
      <Outlet />
    </div>
  );
}
