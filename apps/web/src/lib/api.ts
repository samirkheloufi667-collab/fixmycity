/**
 * Client HTTP de l'API.
 *
 * Le jeton d'accès vit uniquement en mémoire (une variable de module), jamais
 * dans localStorage : un script injecté ne peut pas le lire. Le jeton de
 * rafraîchissement, lui, est dans un cookie httpOnly que le navigateur envoie
 * seul grâce à credentials: 'include'.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4100/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

/**
 * Renouvelle la session. Les appels simultanés partagent la même promesse :
 * le serveur fait tourner les jetons, et deux rafraîchissements parallèles
 * avec le même cookie seraient pris pour un vol de session.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null;
          return false;
        }
        accessToken = ((await res.json()) as { accessToken: string }).accessToken;
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Corps JSON. */
  json?: unknown;
  /** Corps multipart (envoi d'une photo). Le navigateur fixe lui-même le Content-Type. */
  form?: FormData;
}

export async function api<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { json, form, headers: extra, ...init } = options;
  const headers = new Headers(extra);
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      body: form ?? (json === undefined ? undefined : JSON.stringify(json)),
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur. Vérifiez votre connexion.");
  }

  // Jeton d'accès expiré : on renouvelle la session une fois, puis on rejoue.
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return api<T>(path, options, false);
  }

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body.message) message = Array.isArray(body.message) ? body.message.join(' · ') : body.message;
    } catch {
      // Réponse sans corps JSON : on garde le message générique.
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Une erreur inattendue est survenue';

/** Adresse publique d'une photo envoyée. */
export const photoUrl = (name: string) => `${API_URL}/uploads/${encodeURIComponent(name)}`;
