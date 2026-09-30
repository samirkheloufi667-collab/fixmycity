# Architecture de FixMyCity

Chaque section explique **pourquoi** le code est construit ainsi, pour pouvoir
en parler en entretien.

## Vue d'ensemble

```
Navigateur ──► React + Vite (apps/web)     carte Leaflet, formulaire en étapes, espace ville
     │
     └──────► NestJS (apps/api)  /api/*    règles métier, sécurité, photos
                 └── Prisma ──► PostgreSQL
```

## Modèle de données

- `User` porte un **rôle global** : `CITIZEN`, `AGENT` ou `ADMIN` (une seule ville).
- `Report` : titre, description, statut, latitude/longitude, adresse facultative,
  photo, auteur, agent responsable, compteur de soutiens.
- `Support` : « moi aussi », clé primaire (signalement, utilisateur) — un
  soutien ne peut pas exister deux fois.
- `ReportEvent` : **historique unique** du signalement (création, changements de
  statut, attributions, commentaires). La frise de suivi est simplement la liste
  de ces événements, dans l'ordre.
- `Category` : catégories de référence (couleur et icône utilisées par la carte).

`supportCount` est **dénormalisé** : la carte affiche des centaines de points et
trie par soutien, on évite ainsi de compter à chaque requête. Il est mis à jour
dans la même transaction que la table `Support`, jamais séparément.

## Cycle de vie d'un signalement

```
NEW ──► ACKNOWLEDGED ──► IN_PROGRESS ──► RESOLVED
 │            │               │              │
 └──► REJECTED ◄──────────────┘ (retour)     └──► IN_PROGRESS (rouvert)
```

Les transitions permises sont dans un seul tableau (`apps/api/src/reports/status.ts`),
testé unitairement, que l'interface reprend pour ne proposer que des boutons
valides. Un **refus** et une **résolution** exigent un message : l'habitant
doit savoir pourquoi, ou ce qui a été fait.

Le changement de statut utilise une **mise à jour conditionnelle**
(`UPDATE … WHERE id = ? AND status = <statut lu>`). Si deux agents agissent en
même temps, le second modifie zéro ligne et reçoit un 409 au lieu d'écraser le
travail du premier.

## Permissions

1. `JwtAuthGuard` (global) : toute route exige un jeton, sauf `@Public()`. Sur
   une route publique, un jeton valide est tout de même lu : la fiche peut alors
   dire « vous soutenez déjà ce signalement ».
2. `RolesGuard` : pour les routes `@Roles('AGENT', 'ADMIN')`, le rôle est
   **relu en base**, pas pris dans le jeton. Un agent rétrogradé perd ses droits
   immédiatement, sans attendre l'expiration de son jeton (15 min). Un test de
   bout en bout le vérifie.
3. Règles fines dans le service : un agent n'agit que sur ce qui lui est
   attribué, ou prend en charge un signalement libre en le faisant avancer ;
   l'auteur ne peut retirer son signalement que tant qu'il est « reçu » ; un
   administrateur ne peut pas modifier son propre rôle.

L'inscription crée toujours un habitant. `ValidationPipe` en mode
`forbidNonWhitelisted` refuse un champ `role` glissé dans la requête.

## Géolocalisation

- **Territoire** : un cercle (centre + rayon) dans la configuration. Un point
  hors du cercle est refusé par l'API ; l'interface l'affiche en pointillés et
  prévient avant l'envoi.
- **Carte** : l'interface envoie la zone visible (`bbox`) ; l'API filtre avec
  un index sur (latitude, longitude) et renvoie des champs réduits, 1 000 points
  au plus.
- **Doublons** : un rectangle englobant le cercle de 75 m sert de premier filtre
  en base (rapide, indexé), puis la distance exacte est calculée par la formule
  de haversine sur les quelques candidats. PostGIS ferait la même chose en SQL ;
  sans lui, ce découpage reste efficace et testable (`geo.ts`).

## Photos

1. Multer garde le fichier **en mémoire**, 5 Mo au plus, un seul fichier.
2. Le type est déduit des **premiers octets** (JPEG `FF D8 FF`, PNG
   `89 50 4E 47…`), jamais de l'extension ni du Content-Type annoncés.
3. Les **métadonnées sont retirées** en parcourant la structure du fichier :
   segments APP1 (EXIF, dont le GPS), APP13 et commentaires pour le JPEG ; blocs
   eXIf et texte pour le PNG. L'image elle-même n'est pas recompressée.
4. Le fichier est enregistré sous un **nom aléatoire** (UUID). Le nom d'origine
   est ignoré ; la route de lecture n'accepte que ce format, ce qui empêche tout
   `../`.

## Anti-abus

Limiteur à fenêtre fixe en mémoire : 5 tentatives de connexion par minute
(IP + e-mail), 10 signalements par heure et 20 commentaires par 10 minutes par
compte. Pour plusieurs instances de l'API, il faudrait le partager (Redis).

## Interface

- React 19, Vite, React Router, Tailwind CSS 4. Pages chargées à la demande :
  l'accueil ne télécharge ni Leaflet ni l'espace ville.
- Carte : react-leaflet, fond OpenStreetMap. Les épingles sont des `divIcon`
  colorées avec l'icône de la catégorie, mises en cache : une douzaine d'icônes
  pour des centaines de points.
- Composants [React Bits](https://reactbits.dev) : Threads (fond de l'accueil),
  BlurText, RotatingText, CountUp, Magnet, et Stepper **adapté** pour le
  formulaire (étape contrôlée, validation avant « Continuer », carte Leaflet à
  l'intérieur correctement mesurée après l'animation).
- Responsive : sur téléphone, la carte occupe l'écran, les filtres flottent
  au-dessus et un bouton bascule entre carte et liste.
- Les filtres de la file de traitement vivent dans l'adresse (`?status=…`) :
  une vue se partage par lien.

## Base locale sans Docker

`npm run db:local` lance **PGlite** (PostgreSQL compilé en WebAssembly) sur le
port 5434. Particularité : toutes les connexions partagent **une seule session**
PostgreSQL. Deux clients Prisma (l'API et un script) créaient donc des requêtes
préparées de même nom et entraient en conflit. L'URL contient `pgbouncer=true`,
le réglage prévu par Prisma pour ce cas : il n'utilise plus de requêtes
préparées nommées. Avec le PostgreSQL de `docker compose`, ce paramètre est inutile.

## Limites connues et suites possibles

- Pas de notification (e-mail ou push) quand le statut change : l'habitant
  consulte « Mes signalements ».
- Pas de regroupement des épingles (clustering) : suffisant pour une ville
  moyenne, à ajouter au-delà de quelques milliers de points.
- Géocodage inverse (adresse automatique) volontairement absent : il
  dépendrait d'un service externe.
- Photos stockées sur disque (volume Docker) ; en production, un stockage objet
  de type S3 serait préférable.
