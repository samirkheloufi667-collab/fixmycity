import { useRef } from 'react';
import { cx } from '@/lib/format';
import { gsap, prefersReducedMotion, useGSAP } from './gsap';

const GLYPHS = '0123456789';

/**
 * Afficheur à palettes, comme un tableau des départs : chaque caractère fait
 * défiler quelques chiffres en basculant, puis s'arrête sur sa valeur. Les
 * cases de droite s'arrêtent après celles de gauche.
 *
 * Le texte affiché vit dans des éléments que React ne gère pas : l'animation
 * se rejoue d'elle-même quand la valeur change.
 */
export function SplitFlap({ value, className, cellClassName }: { value: string; className?: string; cellClassName?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const chars = [...value];

  useGSAP(
    () => {
      const cells = gsap.utils.toArray<HTMLElement>('[data-cell]', ref.current);
      const glyphs = chars.filter((c) => c !== ' '); // les espaces n'ont pas de case
      cells.forEach((cell, i) => {
        const target = glyphs[i];
        cell.textContent = target;
        if (prefersReducedMotion() || !GLYPHS.includes(target)) return;
        const tl = gsap.timeline({ delay: i * 0.09, scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true } });
        const flips = 6 + i * 2;
        for (let k = 0; k < flips; k++) {
          tl.call(() => {
            cell.textContent = k === flips - 1 ? target : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }).fromTo(cell, { rotateX: -80 }, { rotateX: 0, duration: 0.07, ease: 'power1.out' });
        }
      });
    },
    { scope: ref, dependencies: [value] },
  );

  return (
    <span ref={ref} className={cx('inline-flex gap-[3px] [perspective:400px]', className)} aria-label={value} role="img">
      {chars.map((c, i) =>
        c === ' ' ? (
          <span key={i} className="w-[0.25em]" />
        ) : (
          <span key={i} className={cx('relative inline-flex items-center justify-center bg-ink px-[0.08em] text-paper', cellClassName)} style={{ minWidth: '0.62em' }}>
            {/* Rempli par l'effet ci-dessus : React n'écrit jamais dans cette case. */}
            <span data-cell aria-hidden className="block origin-center" />
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-paper/25" />
          </span>
        ),
      )}
    </span>
  );
}
