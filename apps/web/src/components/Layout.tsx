import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { buttonClass } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { cx, isStaff, ROLE_LABEL } from '@/lib/format';

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cx('flex items-center gap-2.5', className)} aria-label="FixMyCity, accueil">
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="sign text-[26px] leading-none">FixMyCity</span>
    </Link>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cx('sign-wide px-3 py-2 text-[13px] transition-colors', isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-paper-2');

/**
 * En-tête commun, comme un bandeau de signalisation : un filet noir épais en
 * dessous, les rubriques en plaques. `fullBleed` : la page occupe tout
 * l'écran sous l'en-tête (la carte), sans marges ni pied de page.
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
      <header className="sticky top-0 z-[1100] border-b-4 border-ink bg-paper">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 md:flex">{links}</nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/signaler" className={buttonClass('accent', 'md', 'hidden sm:inline-flex')}>
              Signaler ↗
            </Link>
            {status === 'authenticated' && me ? (
              <div className="hidden items-center gap-3 md:flex">
                <span className="text-right leading-tight">
                  <span className="block text-sm font-bold">{me.name.split(' ')[0]}</span>
                  <span className="sign-wide block text-[10px] text-muted">{ROLE_LABEL[me.role]}</span>
                </span>
                <button type="button" onClick={logout} className="u-link sign-wide text-[11px] text-muted hover:text-ink" title="Se déconnecter">
                  Sortir
                </button>
              </div>
            ) : (
              status === 'anonymous' && (
                <Link to="/connexion" className={buttonClass('secondary', 'md', 'hidden md:inline-flex')}>
                  Connexion
                </Link>
              )
            )}
            <button type="button" className="sign-wide border-2 border-ink px-3 py-1.5 text-[12px] md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Fermer' : 'Menu'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t-2 border-ink bg-paper md:hidden"
            >
              <div className="px-4 pt-3 pb-5">
                <nav className="flex flex-col gap-1">{links}</nav>
                <Link to="/signaler" className={buttonClass('accent', 'lg', 'mt-4 w-full')}>
                  Signaler un problème ↗
                </Link>
                {me ? (
                  <div className="mt-4 flex items-center justify-between border-2 border-ink bg-card px-4 py-3">
                    <span className="text-sm">
                      <span className="block font-bold">{me.name}</span>
                      <span className="sign-wide block text-[10px] text-muted">{ROLE_LABEL[me.role]}</span>
                    </span>
                    <button type="button" onClick={logout} className={buttonClass('ghost', 'sm')}>
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <Link to="/connexion" className={buttonClass('secondary', 'lg', 'mt-3 w-full')}>
                    Connexion
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {fullBleed ? (
        <main className="relative min-h-0 flex-1">
          <Outlet />
        </main>
      ) : (
        <>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
            <Outlet />
          </main>
          <Footer />
        </>
      )}
    </div>
  );
}

export function Copyright({ className }: { className?: string }) {
  return <p className={cx('sign-wide text-[11px] text-muted', className)}>© {new Date().getFullYear()} Samir Kheloufi — tous droits réservés</p>;
}

export function Footer() {
  return (
    <footer className="border-t-4 border-ink bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Copyright />
        <p className="text-[13px] text-muted">Projet de démonstration — données fictives, sans lien avec une mairie.</p>
      </div>
    </footer>
  );
}
