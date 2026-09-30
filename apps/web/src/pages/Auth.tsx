import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Logo } from '@/components/Layout';
import { Button, Card, ErrorNote, Field, Input } from '@/components/ui/primitives';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isStaff } from '@/lib/format';

/** Comptes des données de démonstration (prisma/seed.ts), pour qu'un visiteur essaie chaque rôle. */
const DEMO = [
  { label: 'Habitante', email: 'demo@fixmycity.dev' },
  { label: 'Agent', email: 'agent@fixmycity.dev' },
  { label: 'Admin', email: 'admin@fixmycity.dev' },
];

/** N'accepte qu'un chemin interne comme destination après connexion. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[radial-gradient(60rem_30rem_at_50%_-10%,var(--color-brand-soft),transparent)] px-4 py-10">
      <Logo />
      <Card className="mt-8 w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </Card>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const me = await login(email, password);
      navigate(safeNext(params.get('next')) ?? (isStaff(me.role) ? '/admin' : '/mes-signalements'), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  const next = params.get('next');
  return (
    <AuthFrame title="Connexion" subtitle="Suivez vos signalements et ceux de votre quartier.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Mot de passe" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-1">
          Se connecter
        </Button>
      </form>

      <div className="mt-6 rounded-2xl bg-paper-2 p-4">
        <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Essayer un rôle de démonstration</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => {
                setEmail(d.email);
                setPassword('demo1234');
              }}
              className="rounded-xl border border-line-strong bg-card px-2 py-2 text-[13px] font-semibold hover:border-brand hover:text-brand"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{' '}
        <Link to={`/inscription${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand">
          Créer un compte
        </Link>
      </p>
    </AuthFrame>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await register(form);
      navigate(safeNext(params.get('next')) ?? '/signaler', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <AuthFrame title="Créer un compte" subtitle="Gratuit, pour signaler et suivre les problèmes de votre ville.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Prénom et nom" htmlFor="name" hint="Publiquement, seuls votre prénom et l’initiale de votre nom apparaissent.">
          <Input id="name" autoComplete="name" required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum.">
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Button type="submit" size="lg" loading={pending} className="mt-1">
          Créer mon compte
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ?{' '}
        <Link to="/connexion" className="font-semibold text-brand">
          Se connecter
        </Link>
      </p>
    </AuthFrame>
  );
}
