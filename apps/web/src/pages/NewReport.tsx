import { Camera, ImagePlus, Info, LogIn, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { distanceMeters, LocationPicker, type Position } from '@/components/map/LocationPicker';
import Stepper from '@/components/reactbits/Stepper';
import { Button, buttonClass, Card, CategoryIcon, ErrorNote, Field, Input, PageHeader, Spinner, StatusBadge, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx } from '@/lib/format';
import { useReference } from '@/lib/reference';
import type { ReportDetail, ReportSummary } from '@/lib/types';

const MAX_PHOTO = 5 * 1024 * 1024;
const LABELS = ['Lieu', 'Problème', 'Photo', 'Vérification'];

export default function NewReport() {
  const { status, me } = useAuth();
  const { city, categories } = useReference();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [position, setPosition] = useState<Position | null>(null);
  const [address, setAddress] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [nearby, setNearby] = useState<ReportSummary[] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category = categories.find((c) => c.id === categoryId);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  // À la dernière étape, on cherche les signalements déjà ouverts tout près.
  useEffect(() => {
    if (step !== 4 || !position) return;
    setNearby(null);
    const params = new URLSearchParams({ latitude: String(position.latitude), longitude: String(position.longitude) });
    if (categoryId) params.set('categoryId', categoryId);
    api<ReportSummary[]>(`/reports/nearby?${params}`)
      .then(setNearby)
      .catch(() => setNearby([]));
  }, [step, position, categoryId]);

  if (status === 'loading' || !city) return <Spinner />;

  if (!me) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <LogIn className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Connectez-vous pour signaler</h1>
        <p className="mt-2 text-sm text-muted">
          Un compte permet à la ville de vous tenir informé de l’avancement, et limite les faux signalements.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/connexion?next=/signaler" className={buttonClass('primary')}>
            Connexion
          </Link>
          <Link to="/inscription?next=/signaler" className={buttonClass('secondary')}>
            Créer un compte
          </Link>
        </div>
      </Card>
    );
  }

  const outside = position ? distanceMeters(city, position) > city.radiusMeters : false;
  const canContinue =
    step === 1
      ? Boolean(position) && !outside
      : step === 2
        ? Boolean(categoryId) && title.trim().length >= 5 && description.trim().length >= 10
        : step === 3
          ? !photoError
          : true;

  function pickPhoto(file: File | undefined) {
    setPhotoError(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setPhotoError('Format non pris en charge : choisissez une photo JPEG ou PNG. (Sur iPhone, réglez l’appareil photo sur « le plus compatible ».)');
      return;
    }
    if (file.size > MAX_PHOTO) {
      setPhotoError('Photo trop lourde : 5 Mo au maximum.');
      return;
    }
    setPhoto(file);
  }

  async function submit() {
    if (!position) return;
    setSending(true);
    setError(null);
    const form = new FormData();
    form.set('title', title.trim());
    form.set('description', description.trim());
    form.set('categoryId', categoryId);
    form.set('latitude', String(position.latitude));
    form.set('longitude', String(position.longitude));
    if (address.trim()) form.set('address', address.trim());
    if (photo) form.set('photo', photo);
    try {
      const created = await api<ReportDetail>('/reports', { method: 'POST', form });
      toast('success', 'Signalement envoyé. Vous pourrez suivre chaque étape ici.');
      navigate(`/signalements/${created.id}`);
    } catch (e) {
      setError(errorMessage(e));
      setSending(false);
    }
  }

  async function supportExisting(id: string) {
    try {
      await api(`/reports/${id}/support`, { method: 'POST' });
      toast('success', 'Merci ! Vous suivez désormais ce signalement.');
      navigate(`/signalements/${id}`);
    } catch (e) {
      toast('error', errorMessage(e));
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader eyebrow="Nouveau signalement" title="Qu’avez-vous remarqué ?" subtitle="Quatre étapes rapides. La ville reçoit votre signalement dès l’envoi." />

      <Card className="p-5 sm:p-8">
        <Stepper
          step={step}
          onStepChange={setStep}
          onComplete={submit}
          labels={LABELS}
          canContinue={canContinue}
          completing={sending}
          completeText="Envoyer le signalement"
        >
          <section className="flex flex-col gap-4">
            <LocationPicker city={city} value={position} onChange={setPosition} category={category} />
            <Field label="Repère ou adresse (facultatif)" htmlFor="address" hint="Aide l’équipe à trouver l’endroit : numéro, commerce, arrêt de bus…">
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} placeholder="Ex. : devant le 12 rue Pasteur" />
            </Field>
          </section>

          <section className="flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Catégorie</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((c) => {
                  const active = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      aria-pressed={active}
                      className={cx(
                        'flex items-center gap-2.5 rounded-2xl border-2 px-3 py-3 text-left text-sm font-semibold transition-colors',
                        active ? 'bg-card' : 'border-line bg-card hover:border-line-strong',
                      )}
                      style={active ? { borderColor: c.color } : undefined}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${c.color} 15%, white)`, color: c.color }}>
                        <CategoryIcon icon={c.icon} className="size-4" />
                      </span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Field label="Titre" htmlFor="title" hint={`${title.trim().length}/80 — en quelques mots`}>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex. : Lampadaire éteint devant l’école" />
            </Field>
            <Field label="Description" htmlFor="description" hint="Depuis quand ? Est-ce dangereux ? Tout détail aide l’intervention.">
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
            </Field>
          </section>

          <section className="flex flex-col gap-4">
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-line">
                <img src={preview} alt="Aperçu de la photo" className="max-h-80 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <X className="size-3.5" /> Retirer
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line-strong bg-paper px-6 py-12 text-center transition-colors hover:border-brand hover:bg-brand-soft/30">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <ImagePlus className="size-5" />
                </span>
                <span className="mt-3 font-semibold">Ajouter une photo</span>
                <span className="mt-1 text-sm text-muted">JPEG ou PNG, 5 Mo maximum — facultatif mais très utile</span>
                <input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </label>
            )}
            {photoError && <ErrorNote>{photoError}</ErrorNote>}
            <p className="flex items-start gap-2 text-[13px] text-muted">
              <Camera className="mt-0.5 size-4 shrink-0" />
              Les coordonnées GPS et les informations de votre téléphone contenues dans la photo sont supprimées par le serveur avant publication.
            </p>
          </section>

          <section className="flex flex-col gap-5">
            {nearby === null ? (
              <Spinner label="Recherche de signalements proches…" />
            ) : nearby.length > 0 ? (
              <div className="rounded-2xl border border-st-progress/30 bg-st-progress/5 p-4">
                <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                  <Info className="mt-0.5 size-4 shrink-0 text-st-progress" />
                  {nearby.length > 1 ? `${nearby.length} signalements similaires existent` : 'Un signalement similaire existe'} à moins de 75 m. Est-ce le même problème ?
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {nearby.map((n) => (
                    <li key={n.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{n.title}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <StatusBadge status={n.status} /> à {n.distance} m · <Users className="size-3" /> {n.supportCount}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => supportExisting(n.id)}>
                        C’est le même : je soutiens
                      </Button>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">Soutenir plutôt que dupliquer aide la ville à voir ce qui touche le plus de monde.</p>
              </div>
            ) : (
              <p className="rounded-2xl bg-brand-soft/60 px-4 py-3 text-sm text-brand-strong">Aucun signalement similaire à proximité : le vôtre est nouveau.</p>
            )}

            <div className="rounded-2xl border border-line p-4">
              <p className="text-xs font-semibold tracking-[0.12em] text-faint uppercase">Récapitulatif</p>
              <p className="mt-2 font-display text-lg font-semibold">{title}</p>
              <p className="text-sm font-semibold" style={{ color: category?.color }}>
                {category?.name}
                {address ? <span className="font-normal text-muted"> · {address}</span> : null}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{description}</p>
              {photo && <p className="mt-2 text-xs text-muted">Photo jointe : {photo.name}</p>}
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
          </section>
        </Stepper>
      </Card>
    </div>
  );
}
