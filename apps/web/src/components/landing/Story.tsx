import { useRef } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '@/components/motion/gsap';
import { cx, STATUS_COLOR } from '@/lib/format';
import type { ReportStatus } from '@/lib/types';

const STOPS: { status: ReportStatus; station: string; time: string; who: string; role?: string; text: string }[] = [
  { status: 'NEW', station: 'Reçu', time: 'Lun. 08:12', who: 'Léa M.', text: 'Lampadaire éteint devant l’école, rue Pasteur. Le trottoir est très sombre le soir.' },
  { status: 'ACKNOWLEDGED', station: 'Pris en compte', time: 'Lun. 10:40', who: 'Thomas Garnier', role: 'Agent', text: 'Vu. Je passe vérifier l’alimentation dans la journée.' },
  { status: 'IN_PROGRESS', station: 'Intervention', time: 'Mar. 14:05', who: 'Thomas Garnier', role: 'Agent', text: 'Ballast à remplacer. Intervention prévue jeudi matin.' },
  { status: 'RESOLVED', station: 'Résolu', time: 'Jeu. 09:30', who: 'Thomas Garnier', role: 'Agent', text: 'Ballast et ampoule changés. Le lampadaire fonctionne.' },
];

/**
 * Un signalement raconté au défilement, comme un trajet sur une ligne : la
 * rame avance de station en station, chaque arrêt affiche le message de
 * l'étape. Épinglé et piloté par le défilement sur ordinateur ; joué d'un
 * trait à l'entrée sur mobile.
 */
export function Story() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = root.current!;
      const stations = gsap.utils.toArray<HTMLElement>('[data-station]', el);
      const notes = gsap.utils.toArray<HTMLElement>('[data-note]', el);

      const build = (desktop: boolean) => {
        gsap.set(notes, { autoAlpha: 0, y: 24 });
        gsap.set('[data-fill]', { scaleX: 0 });
        const tl = gsap.timeline({
          defaults: { ease: desktop ? 'none' : 'power2.inOut' },
          scrollTrigger: desktop ? { trigger: el, start: 'top top', end: '+=2600', pin: true, scrub: 0.6 } : { trigger: el, start: 'top 70%', once: true },
        });
        STOPS.forEach((stop, i) => {
          if (i > 0) tl.to('[data-fill]', { scaleX: i / (STOPS.length - 1), duration: 1, backgroundColor: STATUS_COLOR[stop.status] });
          tl.to(stations[i], { scale: 1.35, borderColor: STATUS_COLOR[stop.status], duration: 0.2 }, i > 0 ? '>-0.1' : 0)
            .to(stations[i], { scale: 1, duration: 0.2 })
            .to(notes[i], { autoAlpha: 1, y: 0, duration: 0.4 }, '<');
          if (desktop && i < STOPS.length - 1) tl.to(notes[i], { autoAlpha: 0.25, duration: 0.3 }, '+=0.4');
        });
        tl.to('[data-done]', { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }).to({}, { duration: 0.4 });
      };
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => build(true));
      mm.add('(max-width: 1023px)', () => build(false));
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="border-y-4 border-ink bg-paper lg:flex lg:h-svh lg:flex-col lg:justify-center">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="sign-wide inline-block bg-ink px-2 py-0.5 text-[11px] text-paper">Ligne 1 — un signalement</p>
            <h2 className="sign mt-4 text-6xl sm:text-8xl">De la rue à la réparation.</h2>
          </div>
          <p data-done className="sign-wide invisible scale-90 border-2 border-ink bg-st-resolved px-3 py-1.5 text-[13px] text-white">
            Terminus : résolu en 3 jours
          </p>
        </div>

        {/* La ligne : un rail gris, la partie parcourue colorée, quatre stations. */}
        <div className="relative mt-14 hidden lg:block">
          <span className="absolute top-[13px] right-[12.5%] left-[12.5%] h-[8px] bg-line" />
          <span data-fill className="absolute top-[13px] left-[12.5%] h-[8px] w-[75%] origin-left" style={{ background: STATUS_COLOR.NEW }} />
          <ol className="relative grid grid-cols-4">
            {STOPS.map((s) => (
              <li key={s.station} className="flex flex-col items-center">
                <span data-station className="block size-[34px] rounded-full border-[7px] border-line bg-card" />
                <span className="sign mt-3 text-3xl">{s.station}</span>
              </li>
            ))}
          </ol>
        </div>

        <ol className="mt-10 grid gap-4 lg:mt-8 lg:grid-cols-4">
          {STOPS.map((s, i) => (
            <li key={s.station} data-note className={cx('border-2 border-ink bg-card p-4', i === STOPS.length - 1 && 'shadow-[5px_5px_0_var(--color-ink)]')}>
              <p className="flex items-center justify-between">
                <span className="sign-wide text-[12px]" style={{ color: STATUS_COLOR[s.status] }}>
                  <span className="lg:hidden">● {s.station}</span>
                  <span className="hidden lg:inline">{String(i + 1).padStart(2, '0')}</span>
                </span>
                <span className="tnum text-[12px] text-muted">{s.time}</span>
              </p>
              <p className="mt-3 text-[15px] leading-snug">{s.text}</p>
              <p className="mt-3 text-[13px] font-bold">
                {s.who}
                {s.role && <span className="sign-wide ml-2 bg-ink px-1.5 py-0.5 text-[10px] text-paper">{s.role}</span>}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
