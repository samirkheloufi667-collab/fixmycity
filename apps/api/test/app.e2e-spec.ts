/**
 * Tests de bout en bout : l'API NestJS complète contre un vrai PostgreSQL
 * (PGlite en mémoire, démarré par global-setup.mjs, migrations comprises).
 * Rien n'est simulé : c'est la preuve que les règles tiennent réellement.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configure } from '../src/main';
import { PrismaService } from '../src/prisma/prisma.service';

const PORT = 5545;
const CENTER = { latitude: 48.8123, longitude: 2.3605 };

let app: INestApplication;
let http: ReturnType<typeof request>;
let prisma: PrismaService;
let categoryId: string;

/** Une « photo » JPEG minimale, avec des coordonnées GPS dans son bloc EXIF. */
function jpegWithGps(): Buffer {
  const seg = (marker: number, data: Buffer) => {
    const head = Buffer.from([0xff, marker, 0, 0]);
    head.writeUInt16BE(data.length + 2, 2);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01')),
    seg(0xe1, Buffer.from('Exif\0\0GPSLatitude 48.8123 GPSLongitude 2.3605')),
    Buffer.from([0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0x33, 0xff, 0xd9]),
  ]);
}

async function register(email: string, name = 'Test Habitant') {
  const res = await http.post('/api/auth/register').send({ email, name, password: 'motdepasse1' });
  expect(res.status).toBe(201);
  const me = await http.get('/api/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`);
  return { token: res.body.accessToken as string, id: me.body.id as string };
}

/** Crée un compte puis lui donne un rôle, comme le ferait un administrateur. */
async function withRole(email: string, name: string, role: 'AGENT' | 'ADMIN') {
  const user = await register(email, name);
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  const login = await http.post('/api/auth/login').send({ email, password: 'motdepasse1' });
  return { token: login.body.accessToken as string, id: user.id };
}

function createReport(token: string, fields: Record<string, string | number> = {}, photo?: Buffer) {
  const values: Record<string, string | number> = {
    title: 'Lampadaire éteint',
    description: 'Le lampadaire ne s’allume plus depuis lundi.',
    categoryId,
    latitude: CENTER.latitude,
    longitude: CENTER.longitude,
    ...fields,
  };
  const req = http.post('/api/reports').set('Authorization', `Bearer ${token}`);
  for (const [key, value] of Object.entries(values)) req.field(key, String(value));
  if (photo) req.attach('photo', photo, { filename: 'photo.jpg', contentType: 'image/jpeg' });
  return req;
}

beforeAll(async () => {
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?connection_limit=1&sslmode=disable`;
  process.env.JWT_ACCESS_SECRET = 'secret-de-test';
  process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'fixmycity-'));

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configure(moduleRef.createNestApplication());
  await app.init();
  http = request(app.getHttpServer());
  prisma = app.get(PrismaService);
  categoryId = (await prisma.category.create({ data: { slug: 'eclairage', name: 'Éclairage', color: '#E3B23C', icon: 'lightbulb' } })).id;
}, 60_000);

afterAll(async () => {
  await app?.close();
});

describe('accès public et authentification', () => {
  it('la carte, les catégories et la santé sont publiques', async () => {
    expect((await http.get('/api/health')).body).toEqual({ status: 'ok', database: 'up' });
    expect((await http.get('/api/reports/map')).status).toBe(200);
    expect((await http.get('/api/categories')).status).toBe(200);
  });

  it('signaler exige un compte', async () => {
    expect((await http.post('/api/reports').send({})).status).toBe(401);
  });

  it("l'inscription crée toujours un habitant, même si on demande autre chose", async () => {
    const tentative = await http
      .post('/api/auth/register')
      .send({ email: 'malin@test.dev', name: 'Malin', password: 'motdepasse1', role: 'ADMIN' });
    expect(tentative.status).toBe(400);

    const { token } = await register('habitant@test.dev');
    const me = await http.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.role).toBe('CITIZEN');
  });
});

describe('création et photos', () => {
  let citizen: { token: string; id: string };
  beforeAll(async () => {
    citizen = await register('photo@test.dev', 'Léa Martin');
  });

  it('enregistre le signalement et retire les coordonnées GPS de la photo', async () => {
    const res = await createReport(citizen.token, {}, jpegWithGps());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('NEW');
    expect(res.body.supportCount).toBe(1);
    expect(res.body.photo).toMatch(/^[0-9a-f-]{36}\.jpg$/);

    const photo = await http.get(`/api/uploads/${res.body.photo}`).buffer(true);
    expect(photo.status).toBe(200);
    expect(photo.headers['content-type']).toContain('image/jpeg');
    expect(photo.body.includes(Buffer.from('GPS'))).toBe(false);
    expect(photo.body.includes(Buffer.from('JFIF'))).toBe(true);
  });

  it('refuse un fichier qui se fait passer pour une image', async () => {
    const res = await createReport(citizen.token, {}, Buffer.from('<?php system($_GET["c"]); ?>'));
    expect(res.status).toBe(400);
  });

  it('refuse un point hors du territoire de la ville', async () => {
    const res = await createReport(citizen.token, { latitude: 48.8584, longitude: 2.2945 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('hors du territoire');
  });

  it('ne sert que des noms de fichiers générés par le serveur', async () => {
    expect((await http.get('/api/uploads/..%2F.env')).status).toBe(404);
    expect((await http.get('/api/uploads/test.svg')).status).toBe(404);
  });

  it("n'expose jamais l'e-mail de l'auteur et abrège son nom", async () => {
    const created = await createReport(citizen.token);
    const res = await http.get(`/api/reports/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('photo@test.dev');
    expect(res.body.author.name).toBe('Léa M.');
  });

  it("limite le nombre de signalements par heure", async () => {
    const spammer = await register('spam@test.dev');
    for (let i = 0; i < 10; i++) {
      expect((await createReport(spammer.token)).status).toBe(201);
    }
    expect((await createReport(spammer.token)).status).toBe(429);
  });
});

describe('doublons et soutiens', () => {
  let author: { token: string; id: string };
  let voisin: { token: string; id: string };
  let reportId: string;
  beforeAll(async () => {
    author = await register('auteur@test.dev');
    voisin = await register('voisin@test.dev');
    reportId = (await createReport(author.token, { latitude: 48.809, longitude: 2.357 })).body.id;
  });

  it('propose le signalement existant à 20 m, pas à 500 m', async () => {
    const proche = await http.get('/api/reports/nearby').query({ latitude: 48.80918, longitude: 2.357 });
    expect(proche.body.map((r: { id: string }) => r.id)).toContain(reportId);
    const loin = await http.get('/api/reports/nearby').query({ latitude: 48.8135, longitude: 2.357 });
    expect(loin.body.map((r: { id: string }) => r.id)).not.toContain(reportId);
  });

  it('un soutien ne compte qu’une fois', async () => {
    const auth = { Authorization: `Bearer ${voisin.token}` };
    expect((await http.post(`/api/reports/${reportId}/support`).set(auth)).body.supportCount).toBe(2);
    expect((await http.post(`/api/reports/${reportId}/support`).set(auth)).body.supportCount).toBe(2);
    expect((await http.delete(`/api/reports/${reportId}/support`).set(auth)).body.supportCount).toBe(1);
  });

  it("l'auteur ne peut pas retirer son propre soutien", async () => {
    const res = await http.delete(`/api/reports/${reportId}/support`).set('Authorization', `Bearer ${author.token}`);
    expect(res.status).toBe(400);
  });
});

describe('traitement par les services de la ville', () => {
  let citizen: { token: string; id: string };
  let karim: { token: string; id: string };
  let sofia: { token: string; id: string };
  let admin: { token: string; id: string };
  let reportId: string;
  const as = (u: { token: string }) => ({ Authorization: `Bearer ${u.token}` });

  beforeAll(async () => {
    citizen = await register('citoyen@test.dev');
    karim = await withRole('karim@test.dev', 'Karim Benali', 'AGENT');
    sofia = await withRole('sofia@test.dev', 'Sofia Rossi', 'AGENT');
    admin = await withRole('admin@test.dev', 'Nadia Haddad', 'ADMIN');
    reportId = (await createReport(citizen.token)).body.id;
  });

  it('un habitant ne peut pas changer le statut', async () => {
    const res = await http.patch(`/api/reports/${reportId}/status`).set(as(citizen)).send({ status: 'ACKNOWLEDGED' });
    expect(res.status).toBe(403);
    expect((await http.get('/api/admin/stats').set(as(citizen))).status).toBe(403);
  });

  it('refuse de sauter une étape', async () => {
    const res = await http.patch(`/api/reports/${reportId}/status`).set(as(karim)).send({ status: 'RESOLVED', message: 'Fait' });
    expect(res.status).toBe(400);
  });

  it("un agent qui fait avancer un signalement libre le prend en charge", async () => {
    const res = await http.patch(`/api/reports/${reportId}/status`).set(as(karim)).send({ status: 'ACKNOWLEDGED' });
    expect(res.status).toBe(200);
    expect(res.body.assignee.id).toBe(karim.id);
    expect(res.body.events.map((e: { type: string }) => e.type)).toEqual(['CREATED', 'ASSIGNED', 'STATUS_CHANGED']);
  });

  it("un autre agent ne peut pas agir sur un signalement qui n'est pas le sien", async () => {
    const res = await http.patch(`/api/reports/${reportId}/status`).set(as(sofia)).send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(403);
  });

  it("une résolution doit dire ce qui a été fait", async () => {
    await http.patch(`/api/reports/${reportId}/status`).set(as(karim)).send({ status: 'IN_PROGRESS' }).expect(200);
    const sans = await http.patch(`/api/reports/${reportId}/status`).set(as(karim)).send({ status: 'RESOLVED' });
    expect(sans.status).toBe(400);
    const avec = await http
      .patch(`/api/reports/${reportId}/status`)
      .set(as(karim))
      .send({ status: 'RESOLVED', message: 'Ampoule remplacée' });
    expect(avec.status).toBe(200);
    expect(avec.body.resolvedAt).not.toBeNull();
  });

  it("l'auteur ne peut plus retirer un signalement pris en compte", async () => {
    expect((await http.delete(`/api/reports/${reportId}`).set(as(citizen))).status).toBe(400);
  });

  it("on n'attribue un signalement qu'à un agent", async () => {
    const autre = (await createReport(citizen.token)).body.id;
    const versHabitant = await http.patch(`/api/reports/${autre}/assignee`).set(as(admin)).send({ assigneeId: citizen.id });
    expect(versHabitant.status).toBe(400);
    const versSofia = await http.patch(`/api/reports/${autre}/assignee`).set(as(admin)).send({ assigneeId: sofia.id });
    expect(versSofia.body.assignee.id).toBe(sofia.id);
    // Un agent ne peut pas attribuer.
    expect((await http.patch(`/api/reports/${autre}/assignee`).set(as(karim)).send({ assigneeId: karim.id })).status).toBe(403);
  });

  it('un agent rétrogradé perd ses droits immédiatement, même avec un jeton encore valide', async () => {
    await http.patch(`/api/admin/users/${sofia.id}/role`).set(as(admin)).send({ role: 'CITIZEN' }).expect(200);
    const autre = (await createReport(citizen.token)).body.id;
    const res = await http.patch(`/api/reports/${autre}/status`).set(as(sofia)).send({ status: 'ACKNOWLEDGED' });
    expect(res.status).toBe(403);
    // Ses signalements en cours sont libérés.
    expect(await prisma.report.count({ where: { assigneeId: sofia.id } })).toBe(0);
  });

  it("un administrateur ne peut pas modifier son propre rôle", async () => {
    const res = await http.patch(`/api/admin/users/${admin.id}/role`).set(as(admin)).send({ role: 'CITIZEN' });
    expect(res.status).toBe(400);
  });

  it('le tableau de bord compte les signalements par statut', async () => {
    const res = await http.get('/api/admin/stats').set(as(karim));
    expect(res.status).toBe(200);
    expect(res.body.counts.RESOLVED).toBeGreaterThanOrEqual(1);
    expect(res.body.weeks).toHaveLength(8);
    expect(res.body.medianResolutionDays).not.toBeNull();
  });
});
