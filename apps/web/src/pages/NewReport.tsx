import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { distanceMeters, LocationPicker, type Position } from '@/components/map/LocationPicker';
import Stepper from '@/components/Stepper';
import { Button, buttonClass, Card, CategoryMark, ErrorNote, Field, Input, PageHeader, Spinner, StatusBadge, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx, inkOn } from '@/lib/format';
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
      <Card className="mx-auto max-w-lg">
        <div className="hazard h-3 border-b-2 border-ink" aria-hidden />
        <div className="p-8">
          <h1 className="sign text-5xl">Connectez-vous pour signaler</h1>
          <p className="mt-3 text-[15px] text-muted">Un compte permet à la ville de vous tenir informé de l’avancement, et limite les faux signalements.</p>
          <div className="mt-6 flex gap-2">
            <Link to="/connexion?next=/signaler" className={buttonClass('primary')}>
              Connexion
            </Link>
            <Link to="/inscription?next=/signaler" className={buttonClass('secondary')}>
              Créer un compte
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const outside = position ? distanceMeters(city, position) > city.radiusMeters : false;
  const canContinue =
    step === 1 ? Boolean(position) && !outside : step === 2 ? Boolean(categoryId) && title.trim().length >= 5 && description.trim().length >= 10 : step === 3 ? !photoError : true;

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
      <PageHeader eyebrow="Nouveau signalement" title="Qu’avez-vous vu ?" subtitle="Quatre étapes. La ville reçoit votre signalement dès l’envoi." />

      <Card className="p-5 sm:p-8">
        <Stepper step={step} onStepChange={setStep} onComplete={submit} labels={LABELS} canContinue={canContinue} completing={sending} completeText="Envoyer le signalement ↗">
          <section className="flex flex-col gap-5">
            <LocationPicker city={city} value={position} onChange={setPosition} category={category} />
            <Field label="Repère ou adresse (facultatif)" htmlFor="address" hint="Aide l’équipe à trouver l’endroit : numéro, commerce, arrêt de bus…">
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} placeholder="Ex. : devant le 12 rue Pasteur" />
            </Field>
          </section>

          <section className="flex flex-col gap-6">
            <fieldset>
              <legend className="sign-wide mb-2 text-[12px]">Catégorie</legend>
              <div className="grid grid-cols-2 border-t-2 border-l-2 border-ink sm:grid-cols-3">
                {categories.map((c) => {
                  const active = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      aria-pressed={active}
                      className={cx('flex items-center gap-3 border-r-2 border-b-2 border-ink px-3 py-3 text-left text-sm font-bold transition-colors', active ? '' : 'bg-card hover:bg-paper-2')}
                      style={active ? { background: c.color, color: inkOn(c.color) } : undefined}
                    >
                      <CategoryMark category={c} size={34} />
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
              <div className="relative border-2 border-ink">
                <img src={preview} alt="Aperçu de la photo" className="max-h-80 w-full object-cover" />
                <button type="button" onClick={() => setPhoto(null)} className={buttonClass('secondary', 'sm', 'absolute top-3 right-3')}>
                  Retirer ✕
                </button>
              </div>
            ) : (
              <label className="group flex cursor-pointer flex-col items-start border-2 border-dashed border-ink bg-card px-6 py-10 transition-colors hover:bg-signal">
                <span className="sign text-4xl">+ Ajouter une photo</span>
                <span className="mt-2 text-sm text-muted group-hover:text-ink">JPEG ou PNG, 5 Mo maximum — facultatif mais très utile</span>
                <input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
              </label>
            )}
            {photoError && <ErrorNote>{photoError}</ErrorNote>}
            <p className="border-l-4 border-ink pl-3 text-[13px] text-muted">Les coordonnées GPS et les informations de votre téléphone contenues dans la photo sont supprimées par le serveur avant publication.</p>
          </section>

          <section className="flex flex-col gap-5">
            {nearby === null ? (
              <Spinner label="Recherche de signalements proches" />
            ) : nearby.length > 0 ? (
              <div className="border-2 border-ink bg-card">
                <div className="hazard h-2.5 border-b-2 border-ink" aria-hidden />
                <div className="p-4">
                  <p className="text-sm font-bold text-ink">
                    {nearby.length > 1 ? `${nearby.length} signalements similaires existent` : 'Un signalement similaire existe'} à moins de 75 m. Est-ce le même problème ?
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {nearby.map((n) => (
                      <li key={n.id} className="flex flex-wrap items-center gap-3 border-2 border-ink bg-paper p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{n.title}</p>
                          <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                            <StatusBadge status={n.status} /> à {n.distance} m · {n.supportCount} concerné(s)
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
              </div>
            ) : (
              <p className="border-l-4 border-st-resolved pl-3 text-sm font-bold text-st-resolved">Aucun signalement similaire à proximité : le vôtre est nouveau.</p>
            )}

            <div className="border-2 border-ink">
              <p className="sign-wide border-b-2 border-ink bg-ink px-4 py-1.5 text-[11px] text-paper">Récapitulatif</p>
              <div className="flex gap-4 p-4">
                {category && <CategoryMark category={category} size={48} />}
                <div className="min-w-0">
                  <p className="text-lg leading-snug font-bold">{title}</p>
                  <p className="text-sm font-bold">
                    {category?.name}
                    {address ? <span className="font-normal text-muted"> · {address}</span> : null}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{description}</p>
                  {photo && <p className="mt-2 text-xs text-muted">Photo jointe : {photo.name}</p>}
                </div>
              </div>
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
          </section>
        </Stepper>
      </Card>
    </div>
  );
}
