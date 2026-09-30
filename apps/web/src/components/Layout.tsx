import { LayoutDashboard, LogOut, Map, Menu, Plus, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { buttonClass } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { cx, isStaff, ROLE_LABEL } from '@/lib/format';

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cx('flex items-center gap-2.5', className)} aria-label="FixMyCity, accueil">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="font-display text-lg font-bold tracking-tight">
        FixMy<span className="text-brand">City</span>
      </span>
    </Link>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
    isActive ? 'bg-brand-soft text-brand-strong' : 'text-muted hover:bg-paper-2 hover:text-ink',
  );

/**
 * En-tête commun. `fullBleed` : la page occupe tout l'écran sous l'en-tête
 * (la carte), sans marges ni pied de page.
 */
export function Layout({ fullBleed = false }: { fullBleed?: boolean }) {
  const { me, status, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  const links = (
    <>
      <NavLink to="/carte" className={navClass}>
        Carte
      </NavLink>
      {me && (
        <NavLink to="/mes-signalements" className={navClass}>
          Mes signalements
        </NavLink>
      )}
      {isStaff(me?.role) && (
        <NavLink to="/admin" className={navClass}>
          Espace ville
        </NavLink>
      )}
    </>
  );

  return (
    <div className={cx('flex flex-col', fullBleed ? 'h-svh' : 'min-h-svh')}>
      <header className="sticky top-0 z-[1100] border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 md:flex">{links}</nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/signaler" className={buttonClass('accent', 'md', 'hidden sm:inline-flex')}>
              <Plus className="size-4" /> Signaler
            </Link>
            {status === 'authenticated' && me ? (
              <div className="hidden items-center gap-2 md:flex">
                <span className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <UserRound className="size-4" />
                  </span>
                  <span className="leading-tight">
                    <span className="block font-semibold">{me.name.split(' ')[0]}</span>
                    <span className="block text-xs text-muted">{ROLE_LABEL[me.role]}</span>
                  </span>
                </span>
                <button type="button" onClick={logout} className="rounded-lg p-2 text-muted hover:bg-paper-2 hover:text-ink" aria-label="Se déconnecter" title="Se déconnecter">
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              status === 'anonymous' && (
                <Link to="/connexion" className={buttonClass('secondary', 'md', 'hidden md:inline-flex')}>
                  Connexion
                </Link>
              )
            )}
            <button
              type="button"
              className="rounded-xl p-2 text-ink hover:bg-paper-2 md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="border-t border-line bg-paper px-4 pt-3 pb-5 md:hidden">
            <nav className="flex flex-col gap-1">{links}</nav>
            <Link to="/signaler" className={buttonClass('accent', 'lg', 'mt-4 w-full')}>
              <Plus className="size-4" /> Signaler un problème
            </Link>
            {me ? (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-3">
                <span className="text-sm">
                  <span className="block font-semibold">{me.name}</span>
                  <span className="block text-xs text-muted">{ROLE_LABEL[me.role]}</span>
                </span>
                <button type="button" onClick={logout} className={buttonClass('ghost', 'sm')}>
                  <LogOut className="size-4" /> Déconnexion
                </button>
              </div>
            ) : (
              <Link to="/connexion" className={buttonClass('secondary', 'lg', 'mt-3 w-full')}>
                Connexion
              </Link>
            )}
          </div>
        )}
      </header>

      {fullBleed ? (
        <main className="relative min-h-0 flex-1">
          <Outlet />
        </main>
      ) : (
        <>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            <Outlet />
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Map className="size-4 text-brand" />
          <span>FixMyCity — projet de démonstration, données fictives, sans lien avec une mairie.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/carte" className="hover:text-ink">
            Carte
          </Link>
          <Link to="/admin" className="flex items-center gap-1 hover:text-ink">
            <LayoutDashboard className="size-3.5" /> Espace ville
          </Link>
        </div>
      </div>
    </footer>
  );
}
