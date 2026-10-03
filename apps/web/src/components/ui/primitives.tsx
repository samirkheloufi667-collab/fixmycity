import { forwardRef } from 'react';
import { categoryCode, cx, inkOn, STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import type { ReportStatus } from '@/lib/types';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

/*
 * Boutons de panneau : angles droits, capitales étroites, contour noir.
 * « accent » est le jaune signalisation, réservé à l'action de signaler.
 * Au survol, le bouton se décale comme une plaque qu'on enfonce.
 */
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper border-2 border-ink hover:bg-paper hover:text-ink',
  accent: 'bg-signal text-ink border-2 border-ink shadow-[3px_3px_0_var(--color-ink)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]',
  secondary: 'bg-card text-ink border-2 border-ink hover:bg-ink hover:text-paper',
  ghost: 'text-muted hover:text-ink border-2 border-transparent',
  danger: 'bg-card text-danger border-2 border-danger hover:bg-danger hover:text-white',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12px] gap-1.5',
  md: 'h-10 px-4 text-[13px] gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cx(
    // Un bouton masqué sur mobile (« hidden sm:inline-flex ») ne doit pas recevoir
    // aussi « inline-flex » : dans la feuille de style, ce dernier l'emporterait sur « hidden ».
    /(^|\s)hidden(\s|$)/.test(className ?? '') ? null : 'inline-flex',
    'sign-wide items-center justify-center whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 disabled:opacity-40 disabled:pointer-events-none select-none',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <span className="size-3 animate-spin border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
});

const fieldBase =
  'w-full border-2 border-ink bg-card px-3.5 text-[15px] text-ink placeholder:text-faint transition-shadow focus:outline-none focus:shadow-[4px_4px_0_var(--color-signal)]';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(fieldBase, 'h-11', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(fieldBase, 'min-h-28 py-3 leading-relaxed', className)} {...rest} />;
});

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldBase, 'h-11 cursor-pointer pr-8', className)} {...rest} />;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="sign-wide text-[12px] text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

/** Panneau : fond blanc, contour noir épais, sans arrondi ni ombre floue. */
export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('border-2 border-ink bg-card', className)} {...rest} />;
}

/** Plaque rectangulaire de couleur, texte en capitales étroites. */
export function Badge({ color, className, children }: { color: string; className?: string; children: React.ReactNode }) {
  return (
    <span className={cx('sign-wide inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] whitespace-nowrap', className)} style={{ background: color, color: color.startsWith('#') ? inkOn(color) : '#fff' }}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  return (
    <span className={cx('sign-wide inline-flex items-center gap-1.5 text-[11px] whitespace-nowrap', className)} style={{ color: STATUS_COLOR[status] }}>
      <span className="inline-block size-2.5 rounded-full border-2 border-current" style={{ background: status === 'RESOLVED' || status === 'REJECTED' ? 'currentColor' : 'transparent' }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

type CategoryLike = { slug?: string; name: string; color: string };

/** Plaque d'une catégorie : son code de deux lettres, comme une ligne de bus. */
export function CategoryMark({ category, size = 36 }: { category: CategoryLike; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center border-2 border-ink font-extrabold"
      style={{ width: size, height: size, background: category.color, color: inkOn(category.color), fontSize: size * 0.4, fontStretch: '70%' }}
      title={category.name}
      aria-hidden
    >
      {categoryCode(category)}
    </span>
  );
}

export function Spinner({ label = 'Chargement' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16" role="status">
      <span className="hazard block h-3 w-16 animate-[hazard_0.8s_linear_infinite] border-2 border-ink [background-size:40px_40px]" aria-hidden />
      <span className="sign-wide text-[12px] text-muted">{label}…</span>
      <style>{'@keyframes hazard{to{background-position:40px 0}}'}</style>
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-2 border-danger bg-card px-4 py-3 text-sm text-danger" role="alert">
      <span className="sign-wide shrink-0 bg-danger px-1.5 text-[11px] text-white">Erreur</span>
      <div>{children}</div>
    </div>
  );
}

/** État vide : un panneau barré de bandes de chantier, une phrase. */
export function EmptyState({ title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="border-2 border-ink bg-card">
      <div className="hazard h-3 border-b-2 border-ink" aria-hidden />
      <div className="px-6 py-10">
        <h3 className="sign text-4xl">{title}</h3>
        {text && <p className="mt-3 max-w-md text-[15px] text-muted">{text}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-5 border-b-4 border-ink pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="sign-wide mb-3 inline-block bg-ink px-2 py-0.5 text-[11px] text-paper">{eyebrow}</p>}
        <h1 className="sign text-5xl sm:text-7xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
