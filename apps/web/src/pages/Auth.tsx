import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Copyright, Logo } from '@/components/Layout';
import { Button, ErrorNote, Field, Input } from '@/components/ui/primitives';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isStaff } from '@/lib/format';

/** Comptes des données de démonstration (prisma/seed.ts), pour qu'un visiteur essaie chaque rôle. */
const DEMO = [
  { label: 'Léa Martin', role: 'Habitante', email: 'demo@fixmycity.dev' },
  { label: 'Thomas Garnier', role: 'Agent de la ville', email: 'agent@fixmycity.dev' },
  { label: 'Claire Lambert', role: 'Administratrice', email: 'admin@fixmycity.dev' },
];

/** N'accepte qu'un chemin interne comme destination après connexion. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* À gauche, un grand panneau jaune ; à droite, le formulaire. */}
      <div className="flex flex-col justify-between border-ink bg-signal p-6 sm:p-10 lg:border-r-4">
        <Logo />
        <div className="py-14 lg:py-0">
          <h1 className="sign text-7xl sm:text-8xl">{title}</h1>
          <p className="mt-5 max-w-sm text-lg font-medium">{subtitle}</p>
        </div>
        <div className="hazard hidden h-4 border-2 border-ink lg:block" aria-hidden />
      </div>
      <main className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
        <Copyright className="mt-12" />
      </main>
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
    <AuthFrame title="Connexion" subtitle="Suivez vos signalements et ceux de votre quartier, étape par étape.">
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

      <div className="mt-8">
        <p className="sign-wide border-b-4 border-ink pb-2 text-[12px]">Essayer un rôle de démonstration</p>
        <ul>
          {DEMO.map((d) => {
            const selected = email === d.email;
            return (
              <li key={d.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword('demo1234');
                  }}
                  className={`flex w-full items-center justify-between gap-3 border-b-2 border-ink px-2 py-3 text-left transition-colors ${selected ? 'bg-signal' : 'hover:bg-paper-2'}`}
                >
                  <span className="font-bold">{d.label}</span>
                  <span className="sign-wide text-[11px] text-muted">{d.role} →</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-8 text-sm text-muted">
        Pas encore de compte ?{' '}
        <Link to={`/inscription${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="u-link font-bold text-ink">
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
    <AuthFrame title="Nouveau compte" subtitle="Gratuit, pour signaler et suivre les problèmes de votre ville.">
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
      <p className="mt-8 text-sm text-muted">
        Déjà inscrit ?{' '}
        <Link to="/connexion" className="u-link font-bold text-ink">
          Se connecter
        </Link>
      </p>
    </AuthFrame>
  );
}
