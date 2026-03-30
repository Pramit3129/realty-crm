import {
  getToken,
  tryRefreshToken,
  clearToken,
  API_BASE_URL,
  ensureValidAccessToken,
} from "./auth";

/**
 * A wrapper around fetch that:
 * 1. Automatically attaches the Bearer token if available.
 * 2. Handles 401 Unauthorized errors by trying to refresh the token.
 * 3. Retries the original request once if the refresh succeeds.
 * 4. Redirects to "/" if both the original and refresh fail.
 */
export async function api(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  await ensureValidAccessToken();

  const getHeaders = () => {
    const token = getToken();
    const headers = new Headers(options.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  };

  // First attempt
  let res = await fetch(url, {
    ...options,
    headers: getHeaders(),
    credentials: "include",
  });

  // Handle 401 — try refreshing
  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry once with the new token
      res = await fetch(url, {
        ...options,
        headers: getHeaders(),
        credentials: "include",
      });
    } else {
      // Refresh failed — clear token and go home
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }

  return res;
}
