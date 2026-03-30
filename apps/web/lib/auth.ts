// ── API & Token Helpers ───────────────────────────────────────────────
// Centralised constants and helpers for auth.
// Uses localStorage so the token survives page refreshes.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// ── Token management ──────────────────────────────────────────────────

const TOKEN_KEY = "accessToken";
const LEGACY_TOKEN_KEY = "token";

type JwtPayload = {
  exp?: number;
  id?: string;
  _id?: string;
  sub?: string;
};

let refreshPromise: Promise<boolean> | null = null;

function readStorageToken(): string | null {
  if (typeof window === "undefined") return null;

  const token =
    localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);

  if (token && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  return token;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

/** Save the JWT access token to localStorage */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

/** Read the JWT access token from localStorage (null if missing) */
export function getToken(): string | null {
  return readStorageToken();
}

/** Remove the JWT access token */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function getTokenPayload(): JwtPayload | null {
  const token = getToken();
  return token ? parseJwt(token) : null;
}

export function isTokenExpired(token: string, skewMs = 30_000): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;

  return payload.exp * 1000 <= Date.now() + skewMs;
}

export function hasValidAccessToken(): boolean {
  const token = getToken();
  return !!token && !isTokenExpired(token);
}

/** Check whether a token exists */
export function isLoggedIn(): boolean {
  return hasValidAccessToken();
}

/**
 * Attempt to refresh the access token using the httpOnly refresh cookie.
 * Returns `true` if a new access token was obtained, `false` otherwise.
 */
export async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // sends the httpOnly refreshToken cookie
      });

      if (!res.ok) {
        clearToken();
        return false;
      }

      const data = await res.json();
      if (data?.accessToken) {
        setToken(data.accessToken);
        return true;
      }

      clearToken();
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureValidAccessToken(): Promise<string | null> {
  const token = getToken();
  if (token && !isTokenExpired(token)) {
    return token;
  }

  const refreshed = await tryRefreshToken();
  return refreshed ? getToken() : null;
}
