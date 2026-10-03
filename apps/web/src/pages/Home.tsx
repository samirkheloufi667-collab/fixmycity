import Lenis from 'lenis';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { HeroMap } from '@/components/landing/HeroMap';
import { Story } from '@/components/landing/Story';
import { Footer, Logo } from '@/components/Layout';
import { gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP } from '@/components/motion/gsap';
import { SplitFlap } from '@/components/motion/SplitFlap';
import { ReportCard } from '@/components/ReportBits';
import { buttonClass } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { isStaff } from '@/lib/format';
import { useReference } from '@/lib/reference';
import type { Page, PublicStats, ReportSummary } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/** Défilement doux, synchronisé avec ScrollTrigger, seulement sur cette page. */
function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
}

const RULES = [
  { title: 'Photos nettoyées', text: 'Le serveur retire les coordonnées GPS et les informations du téléphone avant de publier une photo.' },
  { title: 'Noms discrets', text: 'Un habitant apparaît en « Léa M. ». Jamais son e-mail, jamais son nom complet.' },
  { title: 'Pas de doublons', text: 'Avant l’envoi, les signalements ouverts à moins de 75 m sont proposés : on soutient au lieu de dupliquer.' },
  { title: 'Les plus anciens d’abord', text: 'La file des agents commence par ce qui attend depuis le plus longtemps. Personne n’est oublié.' },
];

const pad = (n: number | undefined, size: number) => (n === undefined ? '—'.repeat(size) : String(n).padStart(size, '0'));

/**
 * Accueil : la carte de la ville en fond, un grand panneau jaune, un tableau
 * d'affichage pour les chiffres, puis un signalement raconté comme un trajet.
 */
export default function Home() {
  const { me } = useAuth();
  const { city } = useReference();
  const stats = useApi<PublicStats>('/stats');
  const recent = useApi<Page<ReportSummary>>('/reports?pageSize=4&sort=recent');
  const hero = useRef<HTMLElement>(null);
  useSmoothScroll();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      // Le panneau se déplie depuis son bord gauche, puis le texte monte ligne par ligne.
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from('[data-panel]', { clipPath: 'inset(0 100% 0 0)', duration: 0.9, ease: 'expo.inOut' });
      SplitText.create('[data-title]', {
        type: 'lines',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) => tl.from(self.lines, { yPercent: 110, duration: 0.9, stagger: 0.08 }, 0.55),
      });
      tl.from('[data-cta]', { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.9);
    },
    { scope: hero },
  );

  const s = stats.data;
  const median = s?.medianResolutionDays;
  const medianText = median === null || median === undefined ? '—' : median < 1 ? `${Math.round(median * 24)}H` : `${Math.round(median)}J`;

  return (
    <div className="min-h-svh overflow-x-clip">
      <header ref={hero} className="relative flex min-h-[100svh] flex-col border-b-4 border-ink">
        {city && <HeroMap city={city} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-paper via-paper/70 to-transparent" aria-hidden />

        <nav className="relative z-10 border-b-4 border-ink bg-paper">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <Logo />
            <div className="flex items-center gap-1">
              <Link to="/carte" className="sign-wide hidden px-3 py-2 text-[13px] hover:bg-paper-2 sm:block">
                Carte
              </Link>
              {isStaff(me?.role) && (
                <Link to="/admin" className="sign-wide hidden px-3 py-2 text-[13px] hover:bg-paper-2 sm:block">
                  Espace ville
                </Link>
              )}
              <Link to={me ? '/mes-signalements' : '/connexion'} className={buttonClass('secondary', 'md', 'ml-2')}>
                {me ? 'Mes signalements' : 'Connexion'}
              </Link>
            </div>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-10 px-4 py-14 sm:px-6">
          {/* Le grand panneau jaune. */}
          <div data-panel className="w-fit max-w-full border-4 border-ink bg-signal px-6 pt-6 pb-8 shadow-[10px_10px_0_var(--color-ink)] sm:px-10 sm:pt-8 sm:pb-10">
            <p className="sign-wide text-[13px]">Signalement citoyen · {city?.name ?? 'votre ville'}</p>
            <h1 data-title className="sign mt-4 text-[22vw] sm:text-[13vw] lg:text-[10rem]">
              Signalez.
              <br />
              On répare.
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link data-cta to="/signaler" className={buttonClass('accent', 'lg')}>
              Signaler un problème ↗
            </Link>
            <Link data-cta to="/carte" className={buttonClass('secondary', 'lg')}>
              Voir la carte →
            </Link>
          </div>
        </div>

        {/* Tableau d'affichage : les chiffres réels de la démonstration. */}
        <div className="relative z-10 border-t-4 border-ink bg-ink text-paper">
          <dl className="mx-auto grid max-w-7xl grid-cols-3 divide-x-2 divide-paper/20 px-4 sm:px-6">
            {[
              { label: 'Signalements reçus', value: pad(s?.total, 4) },
              { label: 'Problèmes résolus', value: pad(s?.resolved, 4) },
              { label: 'Délai médian', value: medianText },
            ].map((item) => (
              <div key={item.label} className="py-4 pr-3 pl-3 first:pl-0 sm:py-5 sm:pl-6">
                <dt className="sign-wide text-[10px] text-paper/60 sm:text-[11px]">{item.label}</dt>
                <dd className="mt-2">
                  <SplitFlap value={item.value} className="sign text-4xl sm:text-6xl" cellClassName="border border-paper/15 py-1" />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <Story />

      <section className="mx-auto grid max-w-7xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="sign-wide inline-block bg-ink px-2 py-0.5 text-[11px] text-paper">Règles de la ligne</p>
          <h2 className="sign mt-4 text-6xl">Ce que la ville s’engage à faire.</h2>
          <ol className="mt-10 border-t-4 border-ink">
            {RULES.map((r, i) => (
              <li key={r.title} className="group flex gap-5 border-b-2 border-ink py-5">
                <span className="sign flex size-12 shrink-0 items-center justify-center rounded-full border-4 border-ink bg-signal text-2xl transition-transform duration-300 group-hover:-rotate-12">{i + 1}</span>
                <div>
                  <h3 className="sign text-3xl">{r.title}</h3>
                  <p className="mt-1 text-[15px] text-muted">{r.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7">
          <div className="flex items-end justify-between gap-4 border-b-4 border-ink pb-3">
            <h2 className="sign text-4xl">Derniers signalements</h2>
            <Link to="/carte" className="u-link sign-wide text-[12px]">
              Tout voir sur la carte →
            </Link>
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {recent.data?.items.map((r) => <ReportCard key={r.id} report={r} />)}
            {recent.error && <p className="text-sm text-muted">Les signalements ne sont pas disponibles pour le moment.</p>}
          </div>
        </div>
      </section>

      <Link to="/signaler" className="group hazard relative block border-y-4 border-ink">
        <span className="mx-auto flex max-w-7xl justify-center px-4 py-10 sm:px-6">
          <span className="sign border-4 border-ink bg-signal px-8 py-4 text-5xl transition-transform duration-300 group-hover:scale-105 sm:text-7xl">Signaler ↗</span>
        </span>
      </Link>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="sign-wide text-[12px] text-muted">Colophon</p>
          <p className="mt-3 text-2xl font-bold">
            Conçu et développé par{' '}
            <a href="https://samir-kheloufi.netlify.app" target="_blank" rel="noreferrer" className="u-link">
              Samir Kheloufi
            </a>
            .
          </p>
          <a href="https://github.com/samirkheloufi667-collab/fixmycity" target="_blank" rel="noreferrer" className="u-link sign-wide mt-4 inline-block text-[12px] text-muted hover:text-ink">
            Lire le code source →
          </a>
        </div>
        <dl className="border-t-4 border-ink lg:col-span-7">
          {[
            ['Interface', 'React 19, Vite, Tailwind CSS 4, React Leaflet (OpenStreetMap), GSAP, Lenis, Motion'],
            ['API', 'NestJS 11, Prisma, PostgreSQL ; règles de transition des statuts vérifiées côté serveur'],
            ['Photos', 'Type vérifié sur les octets du fichier, métadonnées EXIF (dont le GPS) retirées par le serveur, sans dépendance'],
            ['Qualité', 'Tests unitaires et de bout en bout (Jest, Supertest) sur une vraie base PostgreSQL'],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 border-b-2 border-ink py-3 sm:grid-cols-[8rem_1fr] sm:gap-6">
              <dt className="sign-wide text-[12px]">{k}</dt>
              <dd className="text-[15px]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Footer />
    </div>
  );
}
