// ── API & Token Helpers ───────────────────────────────────────────────
// Centralised constants and helpers for auth.
// Uses localStorage so the token survives page refreshes.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

// ── Token management ──────────────────────────────────────────────────

const TOKEN_KEY = "accessToken";

/** Save the JWT access token to localStorage */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Read the JWT access token from localStorage (null if missing) */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove the JWT access token */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Check whether a token exists */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * Attempt to refresh the access token using the httpOnly refresh cookie.
 * Returns `true` if a new access token was obtained, `false` otherwise.
 */
export async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // sends the httpOnly refreshToken cookie
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data?.accessToken) {
      setToken(data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
