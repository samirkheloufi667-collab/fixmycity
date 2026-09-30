import { ArrowRight, Camera, MapPin, Megaphone, ShieldCheck, Wrench } from 'lucide-react';
import { Link } from 'react-router';
import { Footer, Logo } from '@/components/Layout';
import BlurText from '@/components/reactbits/BlurText';
import CountUp from '@/components/reactbits/CountUp';
import Magnet from '@/components/reactbits/Magnet';
import RotatingText from '@/components/reactbits/RotatingText';
import Threads from '@/components/reactbits/Threads';
import { ReportCard } from '@/components/ReportBits';
import { buttonClass } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { formatDays, isStaff } from '@/lib/format';
import type { Page, PublicStats, ReportSummary } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const PROBLEMS = ['un nid-de-poule', 'un lampadaire éteint', 'un dépôt sauvage', 'un banc cassé', 'un feu en panne'];

const STEPS = [
  { icon: MapPin, title: 'Situez', text: 'Touchez la carte ou laissez votre téléphone vous localiser.' },
  { icon: Camera, title: 'Décrivez', text: 'Une catégorie, deux phrases, une photo si vous voulez.' },
  { icon: Wrench, title: 'Suivez', text: 'Chaque étape de l’intervention s’affiche, jusqu’à la résolution.' },
];

export default function Home() {
  const { me } = useAuth();
  const stats = useApi<PublicStats>('/stats');
  const recent = useApi<Page<ReportSummary>>('/reports?pageSize=4&sort=recent');

  return (
    <div className="min-h-svh">
      <section className="relative overflow-hidden border-b border-line">
        {/* Fond animé (React Bits « Threads ») : des fils qui ondulent comme un plan de ville. */}
        <div className="pointer-events-none absolute inset-0 opacity-80 [mask-image:linear-gradient(to_right,transparent_30%,black_70%)]" aria-hidden>
          <Threads color={[0.06, 0.43, 0.35]} amplitude={1.1} distance={0.2} enableMouseInteraction={false} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-paper to-transparent" aria-hidden />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Logo />
            <div className="flex items-center gap-2">
              <Link to="/carte" className={buttonClass('ghost', 'md', 'hidden sm:inline-flex')}>
                Carte
              </Link>
              {isStaff(me?.role) && (
                <Link to="/admin" className={buttonClass('ghost', 'md', 'hidden sm:inline-flex')}>
                  Espace ville
                </Link>
              )}
              <Link to={me ? '/mes-signalements' : '/connexion'} className={buttonClass('secondary', 'md')}>
                {me ? 'Mes signalements' : 'Connexion'}
              </Link>
            </div>
          </div>

          <div className="max-w-3xl pt-16 pb-24 sm:pt-24 sm:pb-32">
            <p className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-card/80 px-3.5 py-1.5 text-[13px] font-semibold text-brand backdrop-blur">
              <Megaphone className="size-3.5" /> Signalement citoyen
            </p>
            <h1 className="sr-only">Votre ville, signalée et réparée.</h1>
            <BlurText
              text="Votre ville, signalée et réparée."
              animateBy="words"
              direction="top"
              delay={120}
              className="mt-6 font-display text-[44px] leading-[1.02] font-bold tracking-tight text-ink sm:text-7xl"
            />
            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-lg text-muted sm:text-xl" aria-hidden>
              <span>Vous voyez</span>
              <RotatingText
                texts={PROBLEMS}
                mainClassName="overflow-hidden rounded-xl bg-accent px-3 py-1 font-semibold text-white"
                staggerFrom="last"
                staggerDuration={0.02}
                splitLevelClassName="overflow-hidden pb-0.5"
                rotationInterval={2400}
              />
              <span>? Signalez-le en une minute.</span>
            </div>
            <p className="sr-only">Vous voyez un nid-de-poule, un lampadaire éteint ou un dépôt sauvage ? Signalez-le en une minute.</p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Magnet padding={60} magnetStrength={4}>
                <Link to="/signaler" className={buttonClass('accent', 'lg')}>
                  Signaler un problème <ArrowRight className="size-4" />
                </Link>
              </Magnet>
              <Link to="/carte" className={buttonClass('secondary', 'lg')}>
                <MapPin className="size-4" /> Voir la carte
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-12 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'signalements reçus', value: stats.data?.total },
            { label: 'problèmes résolus', value: stats.data?.resolved },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border border-line bg-card px-6 py-5 shadow-card">
              <p className="font-display text-4xl font-bold text-ink">
                {s.value === undefined ? '—' : <CountUp to={s.value} duration={1.2} separator=" " />}
              </p>
              <p className="mt-1 text-sm text-muted">{s.label}</p>
            </div>
          ))}
          <div className="rounded-3xl border border-line bg-card px-6 py-5 shadow-card">
            <p className="font-display text-4xl font-bold text-brand">{formatDays(stats.data?.medianResolutionDays ?? null)}</p>
            <p className="mt-1 text-sm text-muted">délai médian de résolution</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">Comment ça marche</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Trois gestes, et la ville prend le relais.</h2>
          <ol className="mt-8 flex flex-col gap-5">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold">
                    <span className="text-faint">{i + 1}.</span> {title}
                  </p>
                  <p className="text-[15px] text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex items-start gap-3 rounded-2xl bg-brand-soft/70 px-4 py-3.5 text-sm text-brand-strong">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              Vos photos sont nettoyées avant publication : leurs coordonnées GPS et les informations de votre téléphone sont
              supprimées. Votre nom apparaît en « Prénom N. », jamais votre e-mail.
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between">
            <h2 className="font-display text-xl font-semibold">Derniers signalements</h2>
            <Link to="/carte" className="text-sm font-semibold text-brand hover:text-brand-strong">
              Tout voir sur la carte →
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {recent.data?.items.map((r) => <ReportCard key={r.id} report={r} />)}
            {recent.error && <p className="text-sm text-muted">Les signalements ne sont pas disponibles pour le moment.</p>}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
