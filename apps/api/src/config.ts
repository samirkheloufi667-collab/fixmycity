import { resolve } from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

/** Configuration lue à la demande, une fois .env chargé. */
export const config = {
  get port() {
    return Number(process.env.PORT ?? 4100);
  },
  get webOrigin() {
    // Sur Render, l'interface est servie par l'API elle-même : même adresse.
    return process.env.WEB_ORIGIN ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173';
  },
  get jwtAccessSecret() {
    return required('JWT_ACCESS_SECRET');
  },
  get production() {
    return process.env.NODE_ENV === 'production';
  },
  get uploadDir() {
    return resolve(process.env.UPLOAD_DIR ?? './uploads');
  },
  /**
   * Territoire couvert. Un signalement hors de ce cercle est refusé : la
   * ville ne peut pas intervenir chez sa voisine. Données de démonstration
   * centrées sur Le Kremlin-Bicêtre (campus d'Epitech Paris).
   */
  get city() {
    return {
      name: process.env.CITY_NAME ?? 'Ville de démo',
      latitude: Number(process.env.CITY_LAT ?? 48.8123),
      longitude: Number(process.env.CITY_LNG ?? 2.3605),
      radiusMeters: Number(process.env.CITY_RADIUS_M ?? 2000),
      zoom: 15,
    };
  },
  /** Durée de vie du jeton d'accès. Courte : c'est lui qui voyage à chaque requête. */
  accessTtl: '15m' as const,
  /** Durée de vie du jeton de rafraîchissement, en jours. */
  refreshTtlDays: 7,
  /** Tentatives de connexion autorisées par minute, par couple IP + e-mail. */
  loginAttempts: 5,
  /** Signalements qu'un habitant peut créer par heure : freine le spam. */
  reportsPerHour: 10,
  /** Taille maximale d'une photo, en octets. */
  maxPhotoBytes: 5 * 1024 * 1024,
  /** Rayon dans lequel on cherche des doublons avant de créer un signalement, en mètres. */
  duplicateRadiusMeters: 75,
};
