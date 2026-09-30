import { Armchair, Construction, Lightbulb, LoaderCircle, MapPin, Signpost, Trash2, Trees, TriangleAlert } from 'lucide-react';
import { forwardRef } from 'react';
import { cx, STATUS_COLOR, STATUS_LABEL } from '@/lib/format';
import type { ReportStatus } from '@/lib/types';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong shadow-sm',
  accent: 'bg-accent text-white hover:bg-accent-strong shadow-sm shadow-accent/30',
  secondary: 'bg-card text-ink border border-line-strong hover:border-ink/40',
  ghost: 'text-muted hover:text-ink hover:bg-paper-2',
  danger: 'bg-card text-danger border border-danger/30 hover:bg-danger/5',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-2xl',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cx(
    // Un bouton masqué sur mobile (« hidden sm:inline-flex ») ne doit pas recevoir
    // aussi « inline-flex » : dans la feuille de style, ce dernier l'emporterait sur « hidden ».
    /(^|\s)hidden(\s|$)/.test(className ?? '') ? null : 'inline-flex',
    'items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none select-none',
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
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

const fieldBase =
  'w-full rounded-xl border border-line-strong bg-card px-3.5 text-[15px] text-ink placeholder:text-faint transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(fieldBase, 'h-11', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cx(fieldBase, 'min-h-28 py-3 leading-relaxed', className)} {...rest} />;
  },
);

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldBase, 'h-11 pr-8', className)} {...rest} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-3xl border border-line bg-card shadow-card', className)} {...rest} />;
}

export function Badge({ color, className, children }: { color: string; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', className)}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 13%, white)` }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  return (
    <Badge color={STATUS_COLOR[status]} className={className}>
      <span className="size-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  construction: Construction,
  lightbulb: Lightbulb,
  'trash-2': Trash2,
  trees: Trees,
  armchair: Armchair,
  signpost: Signpost,
};

export function CategoryIcon({ icon, className, style }: { icon: string; className?: string; style?: React.CSSProperties }) {
  const Icon = CATEGORY_ICONS[icon] ?? MapPin;
  return <Icon className={className} style={style} aria-hidden />;
}

/** Pastille colorée avec l'icône de la catégorie. */
export function CategoryMark({ icon, color, size = 36 }: { icon: string; color: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${color} 15%, white)`, color }}
    >
      <CategoryIcon icon={icon} className="size-[45%]" />
    </span>
  );
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted" role="status">
      <LoaderCircle className="size-5 animate-spin text-brand" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</span>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
