# FixMyCity

Application de **signalement citoyen** : un habitant repère un problème dans sa
ville (nid-de-poule, lampadaire éteint, dépôt sauvage…), le situe sur la carte,
ajoute une photo, puis suit sa résolution étape par étape. Les agents de la
ville traitent les signalements depuis un espace dédié, avec file de traitement
et tableau de bord.

> Projet de portfolio full stack — React · TypeScript · NestJS · PostgreSQL · Leaflet · Docker

> **Démo en ligne : [fixmycity-vd1n.onrender.com](https://fixmycity-vd1n.onrender.com)** — compte `demo@fixmycity.dev` / `demo1234`.
> Hébergement gratuit : le premier chargement peut prendre environ une minute ; les données de démonstration sont réinitialisées à chaque redémarrage.

## Fonctionnalités

| | |
|---|---|
| **Carte publique** | Tous les signalements sur une carte Leaflet, filtrés par catégorie et par statut. La liste suit la zone visible. Pas besoin de compte pour consulter. |
| **Signaler en 4 étapes** | Lieu (touche sur la carte ou GPS du téléphone), catégorie et description, photo facultative, puis vérification des doublons. |
| **Anti-doublons** | Avant l'envoi, les signalements ouverts à moins de 75 m sont proposés : l'habitant peut les soutenir (« Moi aussi ») au lieu d'en créer un nouveau. |
| **Suivi** | Avancement Reçu → Pris en compte → Intervention → Résolu, avec historique complet et commentaires. |
| **Rôles** | Habitant, agent de la ville, administrateur. Un agent qui fait avancer un signalement libre le prend en charge ; seul un administrateur attribue et gère les rôles. |
| **Espace ville** | Tableau de bord (ouverts, délai médian, reçus/résolus par semaine, charge des agents), file de traitement filtrable, gestion des utilisateurs. |
| **Vie privée** | Les coordonnées GPS et les métadonnées des photos sont supprimées côté serveur. Un habitant apparaît en « Prénom N. », jamais avec son e-mail. |
| **Sécurité** | JWT court en mémoire, rafraîchissement en cookie httpOnly avec rotation, rôle vérifié en base à chaque action sensible, photos contrôlées par leur contenu réel, limitation du spam. |

## Démarrage rapide

Prérequis : Node.js 22 ou plus.

### Sans Docker

Une base PostgreSQL embarquée (PGlite) remplace le serveur PostgreSQL.

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:setup      # migrations + données de démo
npm run db:local      # laisse tourner la base (terminal 1)
npm run dev:api       # API sur :4100 (terminal 2)
npm run dev:web       # interface sur :5173 (terminal 3)
```

### Avec Docker

```bash
docker compose up --build
docker compose exec -e NODE_ENV=development api npx tsx prisma/seed.ts
```

Interface : http://localhost:8080 · API : http://localhost:4100/api

### Comptes de démonstration

Mot de passe commun : `demo1234` — la page de connexion propose aussi trois boutons pour les remplir.

| E-mail | Rôle |
|---|---|
| `demo@fixmycity.dev` | Habitante (Léa) : ses signalements couvrent tous les statuts |
| `agent@fixmycity.dev` | Agent de la ville (Karim) |
| `admin@fixmycity.dev` | Administratrice (Nadia) |

Les données sont fictives. La carte est centrée sur Le Kremlin-Bicêtre (campus
d'Epitech Paris) ; le projet n'a aucun lien avec une mairie.

## Tests

```bash
npm test            # 35 tests unitaires : distances, cycle de vie, nettoyage des photos, limiteur, statistiques
npm run test:e2e    # 22 tests de bout en bout sur une vraie base PostgreSQL en mémoire
```

Les tests de bout en bout vérifient notamment qu'une photo publiée ne contient
plus ses coordonnées GPS, qu'un script déguisé en image est refusé, qu'un
signalement hors du territoire est rejeté, que l'e-mail de l'auteur n'est
jamais exposé, qu'un agent ne peut pas agir sur le signalement d'un collègue et
qu'un agent rétrogradé perd ses droits immédiatement, même avec un jeton encore valide.

## Structure

```
apps/
  api/   NestJS 11 + Prisma 6 (PostgreSQL)
  web/   React 19 + Vite + React Router + Tailwind CSS 4 + Leaflet
docs/
  ARCHITECTURE.md   choix techniques et leurs raisons
docker-compose.yml  PostgreSQL, API, interface (nginx)
```

## Crédits

- Composants animés de [React Bits](https://reactbits.dev) : Threads, BlurText,
  RotatingText, CountUp, Magnet et Stepper (adapté ; voir l'en-tête de chaque
  fichier dans `apps/web/src/components/reactbits/`).
- Fond de carte © [contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright).
- Icônes [Lucide](https://lucide.dev).
