import { AnimatePresence, motion } from 'motion/react';
import { Children, useState, type ReactNode } from 'react';
import { buttonClass } from '@/components/ui/primitives';
import { cx } from '@/lib/format';

/**
 * Formulaire en plusieurs étapes, dessiné comme une ligne de transport :
 * chaque étape est une station numérotée, la ligne se colore à mesure qu'on
 * avance. L'étape est contrôlée par le parent (`step`, `onStepChange`) pour
 * valider chacune ; `canContinue` bloque le bouton suivant.
 */
export default function Stepper({
  children,
  step,
  onStepChange,
  onComplete,
  labels,
  canContinue = true,
  completing = false,
  completeText = 'Envoyer',
}: {
  children: ReactNode;
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  labels: string[];
  canContinue?: boolean;
  completing?: boolean;
  completeText?: string;
}) {
  const [direction, setDirection] = useState(1);
  const steps = Children.toArray(children);
  const total = steps.length;
  const isLast = step === total;

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    onStepChange(next);
  };

  return (
    <div className="w-full">
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }} aria-label="Étapes">
        <span aria-hidden className="absolute top-[15px] h-[6px] bg-line" style={{ left: `${50 / total}%`, right: `${50 / total}%` }} />
        <span
          aria-hidden
          className="absolute top-[15px] h-[6px] bg-ink transition-[width] duration-700 ease-[var(--ease-out-expo)]"
          style={{ left: `${50 / total}%`, width: `${((step - 1) / (total - 1)) * (100 - 100 / total)}%` }}
        />
        {labels.map((label, index) => {
          const n = index + 1;
          const done = n < step;
          const active = n === step;
          return (
            <li key={label} className="relative flex flex-col items-center">
              <button
                type="button"
                disabled={n > step}
                onClick={() => n < step && go(n)}
                aria-current={active ? 'step' : undefined}
                className={cx(
                  'sign-wide relative z-10 flex size-9 items-center justify-center rounded-full border-[3px] border-ink text-[14px] transition-colors disabled:cursor-default',
                  active ? 'bg-signal text-ink' : done ? 'bg-ink text-paper' : 'bg-card text-faint',
                )}
              >
                {done ? '✓' : n}
              </button>
              <span className={cx('sign-wide mt-2 hidden text-[11px] sm:block', active ? 'text-ink' : 'text-faint')}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="sign-wide mt-4 text-[12px] sm:hidden">
        Étape {step}/{total} · {labels[step - 1]}
      </p>

      <div className="mt-8 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {steps[step - 1]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={cx('mt-8 flex gap-3 border-t-2 border-ink pt-6', step !== 1 ? 'justify-between' : 'justify-end')}>
        {step !== 1 && (
          <button type="button" onClick={() => go(step - 1)} className={buttonClass('secondary')}>
            ← Retour
          </button>
        )}
        {isLast ? (
          <button type="button" onClick={onComplete} disabled={completing} className={buttonClass('accent', 'lg')}>
            {completing ? 'Envoi…' : completeText}
          </button>
        ) : (
          <button type="button" onClick={() => go(step + 1)} disabled={!canContinue} className={buttonClass('primary', 'lg')}>
            Continuer →
          </button>
        )}
      </div>
    </div>
  );
}
