// Composant Stepper de React Bits (https://reactbits.dev), variante TypeScript + Tailwind.
// Adaptations pour FixMyCity :
//  - étape contrôlée par le parent (`step`, `onStepChange`) pour pouvoir valider chaque étape ;
//  - `canContinue` bloque le bouton suivant tant que l'étape est incomplète ;
//  - libellés en français, couleurs du thème, plus de ratio d'aspect imposé ;
//  - le contenu n'est plus en position absolue une fois l'animation finie,
//    pour qu'une carte Leaflet à l'intérieur mesure correctement sa taille.
import { AnimatePresence, motion, type Variants } from 'motion/react';
import React, { Children, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

interface StepperProps {
  children: ReactNode;
  step: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  labels: string[];
  canContinue?: boolean;
  completing?: boolean;
  completeText?: string;
}

export default function Stepper({
  children,
  step,
  onStepChange,
  onComplete,
  labels,
  canContinue = true,
  completing = false,
  completeText = 'Envoyer',
}: StepperProps) {
  const [direction, setDirection] = useState(0);
  const steps = Children.toArray(children);
  const total = steps.length;
  const isLast = step === total;

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    onStepChange(next);
  };

  return (
    <div className="w-full">
      <ol className="flex items-center gap-2 sm:gap-3" aria-label="Étapes">
        {labels.map((label, index) => {
          const n = index + 1;
          const status = n === step ? 'active' : n < step ? 'complete' : 'inactive';
          return (
            <React.Fragment key={label}>
              <li className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={n > step}
                  onClick={() => n < step && go(n)}
                  aria-current={n === step ? 'step' : undefined}
                  className="flex items-center gap-2 disabled:cursor-default"
                >
                  <StepIndicator step={n} status={status} />
                  <span className={`hidden text-sm font-semibold md:inline ${status === 'inactive' ? 'text-faint' : 'text-ink'}`}>
                    {label}
                  </span>
                </button>
              </li>
              {n < total && <StepConnector isComplete={step > n} />}
            </React.Fragment>
          );
        })}
      </ol>
      <p className="mt-3 text-sm font-semibold text-brand md:hidden">
        Étape {step} sur {total} · {labels[step - 1]}
      </p>

      <StepContentWrapper currentStep={step} direction={direction} className="mt-6">
        {steps[step - 1]}
      </StepContentWrapper>

      <div className={`mt-8 flex ${step !== 1 ? 'justify-between' : 'justify-end'} gap-3`}>
        {step !== 1 && (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-paper-2 hover:text-ink"
          >
            Retour
          </button>
        )}
        <button
          type="button"
          disabled={!canContinue || completing}
          onClick={() => (isLast ? onComplete() : go(step + 1))}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-45 ${
            isLast ? 'bg-accent hover:bg-accent-strong' : 'bg-brand hover:bg-brand-strong'
          }`}
        >
          {completing ? 'Envoi…' : isLast ? completeText : 'Continuer'}
        </button>
      </div>
    </div>
  );
}

function StepContentWrapper({
  currentStep,
  direction,
  children,
  className = '',
}: {
  currentStep: number;
  direction: number;
  children: ReactNode;
  className?: string;
}) {
  const [parentHeight, setParentHeight] = useState<number | 'auto'>('auto');

  return (
    <motion.div
      style={{ position: 'relative', overflow: 'hidden' }}
      animate={{ height: parentHeight }}
      transition={{ type: 'spring', duration: 0.4 }}
      className={className}
    >
      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <SlideTransition
          key={currentStep}
          direction={direction}
          onHeightReady={setParentHeight}
          onSettled={() => setParentHeight('auto')}
        >
          {children}
        </SlideTransition>
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({
  children,
  direction,
  onHeightReady,
  onSettled,
}: {
  children: ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
  onSettled: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current) onHeightReady(containerRef.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.35 }}
      onAnimationComplete={(definition) => definition === 'center' && onSettled()}
    >
      {children}
    </motion.div>
  );
}

const stepVariants: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '-30%' : '30%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '30%' : '-30%', opacity: 0 }),
};

function StepIndicator({ step, status }: { step: number; status: 'active' | 'inactive' | 'complete' }) {
  return (
    <motion.div animate={status} initial={false} className="relative">
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: '#efeae0', color: '#8c958f' },
          active: { scale: 1, backgroundColor: '#0f6e5a', color: '#ffffff' },
          complete: { scale: 1, backgroundColor: '#0f6e5a', color: '#ffffff' },
        }}
        transition={{ duration: 0.3 }}
        className="flex size-8 items-center justify-center rounded-full text-sm font-semibold"
      >
        {status === 'complete' ? (
          <CheckIcon className="size-4" />
        ) : status === 'active' ? (
          <div className="size-2.5 rounded-full bg-white" />
        ) : (
          <span>{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants: Variants = {
    incomplete: { width: 0, backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: '#0f6e5a' },
  };
  return (
    <li aria-hidden className="relative h-0.5 flex-1 overflow-hidden rounded bg-line-strong">
      <motion.div
        className="absolute top-0 left-0 h-full"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </li>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
