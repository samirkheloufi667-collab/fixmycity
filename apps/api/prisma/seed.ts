/**
 * Données de démonstration : une ville fictive centrée sur Le Kremlin-Bicêtre.
 * Toutes les personnes et tous les signalements sont inventés.
 *
 *   npm run db:seed        (efface puis recrée tout)
 */
import { EventType, PrismaClient, ReportStatus } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();
const DAY = 86_400_000;
const CENTER = { lat: 48.8123, lng: 2.3605 };

// Générateur pseudo-aléatoire à graine fixe : la démo est identique à chaque exécution.
let seed = 20260930;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];

/** Point aléatoire dans un disque de `meters` mètres autour du centre. */
function around(meters: number) {
  const r = meters * Math.sqrt(rand());
  const a = rand() * 2 * Math.PI;
  return {
    latitude: CENTER.lat + (r * Math.cos(a)) / 111_320,
    longitude: CENTER.lng + (r * Math.sin(a)) / (111_320 * Math.cos((CENTER.lat * Math.PI) / 180)),
  };
}

const CATEGORIES = [
  { slug: 'voirie', name: 'Voirie', color: '#E0703A', icon: 'construction' },
  { slug: 'eclairage', name: 'Éclairage public', color: '#E3B23C', icon: 'lightbulb' },
  { slug: 'proprete', name: 'Propreté', color: '#3E8E6B', icon: 'trash-2' },
  { slug: 'espaces-verts', name: 'Espaces verts', color: '#6BA547', icon: 'trees' },
  { slug: 'mobilier', name: 'Mobilier urbain', color: '#5B7FC7', icon: 'armchair' },
  { slug: 'signalisation', name: 'Signalisation', color: '#C0506B', icon: 'signpost' },
];

const STREETS = [
  'avenue de Fontainebleau',
  'rue Gabriel Péri',
  'avenue Eugène Thomas',
  'rue Pasteur',
  'rue Danton',
  'boulevard Chastenet de Géry',
  'rue Charles Gide',
  'rue Carnot',
  'rue du Général Leclerc',
  'place Jean Jaurès',
];

const IDEAS: Record<string, { title: string; description: string }[]> = {
  voirie: [
    { title: 'Nid-de-poule profond sur la chaussée', description: 'Un trou d’une vingtaine de centimètres s’est formé au milieu de la voie. Les vélos font des écarts pour l’éviter, c’est dangereux le soir.' },
    { title: 'Trottoir soulevé par des racines', description: 'Les dalles du trottoir sont soulevées sur plusieurs mètres. Une personne âgée a trébuché hier, et les poussettes ne passent plus.' },
    { title: 'Plaque d’égout qui claque', description: 'La plaque bouge à chaque passage de voiture et fait un bruit très fort, y compris la nuit.' },
    { title: 'Affaissement de la chaussée', description: 'La route s’est creusée devant le passage piéton, une grande flaque se forme dès qu’il pleut.' },
  ],
  eclairage: [
    { title: 'Lampadaire éteint depuis une semaine', description: 'Le lampadaire devant l’arrêt de bus ne s’allume plus. La rue est très sombre à partir de 19 h.' },
    { title: 'Éclairage qui clignote', description: 'Trois lampadaires d’affilée clignotent toute la nuit, c’est gênant pour les riverains.' },
    { title: 'Lampadaire resté allumé en plein jour', description: 'Le lampadaire reste allumé toute la journée depuis plusieurs jours.' },
  ],
  proprete: [
    { title: 'Dépôt sauvage d’encombrants', description: 'Un canapé, un matelas et plusieurs sacs ont été déposés au pied des immeubles. Ça bloque en partie le trottoir.' },
    { title: 'Poubelle publique qui déborde', description: 'La corbeille n’a pas été vidée depuis plusieurs jours, les déchets s’envolent sur la chaussée.' },
    { title: 'Tags sur la façade de l’école', description: 'De nouveaux tags sont apparus sur le mur de l’école primaire, visibles depuis la cour.' },
    { title: 'Verre cassé sur l’aire de jeux', description: 'Des bouteilles ont été cassées près du toboggan. Les enfants jouent juste à côté.' },
  ],
  'espaces-verts': [
    { title: 'Branche menaçant de tomber', description: 'Une grosse branche est fendue et pend au-dessus du trottoir après le coup de vent de mardi.' },
    { title: 'Pelouse du square non tondue', description: 'L’herbe dépasse 40 cm, on ne peut plus utiliser la pelouse et les tiques inquiètent les parents.' },
    { title: 'Arbre mort à remplacer', description: 'L’arbre de l’alignement n’a plus de feuilles depuis le printemps et l’écorce se décolle.' },
  ],
  mobilier: [
    { title: 'Banc cassé dans le square', description: 'Deux lattes du banc sont cassées, il y a des vis qui dépassent.' },
    { title: 'Arceaux vélo arrachés', description: 'Trois arceaux à vélos ont été arrachés du sol, les vélos sont attachés aux grilles des arbres.' },
    { title: 'Abribus avec la vitre brisée', description: 'La vitre latérale de l’abribus est brisée, il reste des éclats au sol.' },
  ],
  signalisation: [
    { title: 'Panneau stop tourné', description: 'Le panneau stop a été tourné de 90° et n’est plus visible des voitures qui arrivent.' },
    { title: 'Passage piéton effacé', description: 'Les bandes blanches du passage piéton ont presque disparu, devant la sortie de l’école.' },
    { title: 'Feu piéton en panne', description: 'Le bonhomme vert ne s’allume plus, les piétons traversent au hasard.' },
  ],
};

const REJECT_REASONS = [
  'Ce terrain appartient à un bailleur privé : nous lui avons transmis votre signalement.',
  'Doublon d’un signalement déjà en cours de traitement à quelques mètres.',
];
const RESOLUTIONS = [
  'Intervention réalisée, la zone est sécurisée.',
  'Réparation effectuée par l’équipe technique.',
  'Enlèvement effectué, merci pour votre signalement.',
  'Remplacement terminé.',
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refus de charger des données de démonstration en production');
  }

  await prisma.$transaction([
    prisma.reportEvent.deleteMany(),
    prisma.support.deleteMany(),
    prisma.report.deleteMany(),
    prisma.category.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await hashPassword('demo1234');
  const mk = (email: string, name: string, role: 'CITIZEN' | 'AGENT' | 'ADMIN') =>
    prisma.user.create({ data: { email, name, role, passwordHash } });

  const lea = await mk('demo@fixmycity.dev', 'Léa Martin', 'CITIZEN');
  const karim = await mk('agent@fixmycity.dev', 'Karim Benali', 'AGENT');
  const sofia = await mk('agent2@fixmycity.dev', 'Sofia Rossi', 'AGENT');
  const nadia = await mk('admin@fixmycity.dev', 'Nadia Haddad', 'ADMIN');
  const others = await Promise.all(
    [
      ['hugo@fixmycity.dev', 'Hugo Lefèvre'],
      ['ines@fixmycity.dev', 'Inès Moreau'],
      ['yanis@fixmycity.dev', 'Yanis Cherif'],
      ['chloe@fixmycity.dev', 'Chloé Dubois'],
      ['omar@fixmycity.dev', 'Omar Diallo'],
    ].map(([email, name]) => mk(email, name, 'CITIZEN')),
  );
  const citizens = [lea, ...others];
  const agents = [karim, sofia];

  const categories = await Promise.all(CATEGORIES.map((data) => prisma.category.create({ data })));

  // Répartition réaliste : beaucoup de signalements récents encore ouverts, des plus anciens résolus.
  const plan: ReportStatus[] = [
    ...Array(7).fill('NEW'),
    ...Array(6).fill('ACKNOWLEDGED'),
    ...Array(6).fill('IN_PROGRESS'),
    ...Array(11).fill('RESOLVED'),
    ...Array(2).fill('REJECTED'),
  ];

  let count = 0;
  for (const [i, status] of plan.entries()) {
    const category = categories[i % categories.length];
    const idea = pick(IDEAS[category.slug]);
    // Les signalements de Léa (compte de démo) : un par statut principal, pour voir le suivi.
    const author = i < 4 ? lea : pick(citizens);
    const ageDays =
      status === 'NEW' ? 0.2 + rand() * 3 : status === 'RESOLVED' || status === 'REJECTED' ? 8 + rand() * 45 : 3 + rand() * 18;
    const createdAt = new Date(Date.now() - ageDays * DAY);
    // Un problème résolu l'a été en 1 à 12 jours ; les autres étapes s'étalent jusqu'à aujourd'hui.
    const end = status === 'RESOLVED' ? createdAt.getTime() + (1 + rand() * 11) * DAY : Date.now();
    const at = (fraction: number) => new Date(createdAt.getTime() + fraction * (end - createdAt.getTime()));

    const assignee = status === 'NEW' ? null : status === 'REJECTED' ? null : pick(agents);
    const events: { type: EventType; fromStatus?: ReportStatus; toStatus?: ReportStatus; message?: string; actorId: string; createdAt: Date }[] = [
      { type: 'CREATED', toStatus: 'NEW', actorId: author.id, createdAt },
    ];
    const step = (from: ReportStatus, to: ReportStatus, fraction: number, actorId: string, message?: string) =>
      events.push({ type: 'STATUS_CHANGED', fromStatus: from, toStatus: to, actorId, message, createdAt: at(fraction) });

    let resolvedAt: Date | null = null;
    if (status === 'REJECTED') {
      step('NEW', 'REJECTED', 0.15, nadia.id, pick(REJECT_REASONS));
    } else if (status !== 'NEW') {
      events.push({ type: 'ASSIGNED', message: `Attribué à ${assignee!.name}`, actorId: nadia.id, createdAt: at(0.05) });
      step('NEW', 'ACKNOWLEDGED', 0.1, assignee!.id, 'Signalement vérifié sur place.');
      if (status === 'IN_PROGRESS' || status === 'RESOLVED') {
        step('ACKNOWLEDGED', 'IN_PROGRESS', 0.35, assignee!.id, 'Intervention planifiée avec l’équipe technique.');
      }
      if (status === 'RESOLVED') {
        resolvedAt = at(1);
        events.push({
          type: 'STATUS_CHANGED',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'RESOLVED',
          message: pick(RESOLUTIONS),
          actorId: assignee!.id,
          createdAt: resolvedAt,
        });
      }
    }
    if (rand() < 0.35) {
      const commenter = pick(citizens);
      events.push({
        type: 'COMMENT',
        message: pick(['Toujours le cas ce matin.', 'Merci, c’est vraiment gênant.', 'Même constat de mon côté.']),
        actorId: commenter.id,
        createdAt: at(0.2),
      });
    }
    events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Soutiens : l'auteur, plus quelques voisins.
    const supporters = new Set([author.id]);
    const extra = Math.floor(rand() * 5);
    for (let k = 0; k < extra; k++) supporters.add(pick(citizens).id);

    await prisma.report.create({
      data: {
        title: idea.title,
        description: idea.description,
        status,
        ...around(1100),
        address: `${Math.ceil(rand() * 120)} ${pick(STREETS)}`,
        categoryId: category.id,
        authorId: author.id,
        assigneeId: assignee?.id ?? null,
        supportCount: supporters.size,
        createdAt,
        resolvedAt,
        supports: { create: [...supporters].map((userId) => ({ userId, createdAt })) },
        events: { create: events },
      },
    });
    count += 1;
  }

  console.log(`Ville de démo : ${citizens.length} habitants, ${agents.length} agents, 1 administratrice, ${count} signalements.`);
  console.log('Comptes (mot de passe demo1234) :');
  console.log('  habitante       demo@fixmycity.dev');
  console.log('  agent           agent@fixmycity.dev');
  console.log('  administratrice admin@fixmycity.dev');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
