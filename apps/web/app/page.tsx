"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTable from "@/components/dashboard/DashboardTable";
import AuthModal from "@/components/auth/LoginModal";
import {
  isLoggedIn,
  getToken,
  clearToken,
  tryRefreshToken,
  API_BASE_URL,
} from "@/lib/auth";

// ── Auth state machine ───────────────────────────────────────────────
// "checking"       → loading spinner while we figure things out
// "unauthenticated"→ show login modal (providers / email form)
// "needs-workspace"→ show workspace-creation modal
// "ready"          → redirect to /dashboard (user has token + workspace)
type AuthState = "checking" | "unauthenticated" | "needs-workspace" | "ready";

export default function Home() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    /** Fetch workspace with the current access token */
    async function fetchWorkspace(): Promise<Response> {
      return fetch(`${API_BASE_URL}/workspace`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
    }

    async function resolve() {
      // 1. No token → show login
      if (!isLoggedIn()) {
        setAuthState("unauthenticated");
        return;
      }

      // 2. Has token → check for workspace
      try {
        let res = await fetchWorkspace();

        // 2a. Token expired / invalid → try to refresh
        if (res.status === 401) {
          const refreshed = await tryRefreshToken();
          if (refreshed) {
            // Got a new access token — retry
            res = await fetchWorkspace();
          } else {
            // Refresh also failed → send to login
            clearToken();
            setAuthState("unauthenticated");
            return;
          }
        }

        // 2b. Still a non-401 error after potential refresh
        if (!res.ok) {
          // Server error or other issue — don't show workspace form
          clearToken();
          setAuthState("unauthenticated");
          return;
        }

        // 2c. Success — check if workspace exists
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0 && data[0]?._id) {
          setAuthState("ready");
          const redirect = sessionStorage.getItem("postLoginRedirect");
          if (redirect) {
             sessionStorage.removeItem("postLoginRedirect");
             router.replace(redirect);
          } else {
             router.replace("/dashboard");
          }
          return;
        }

        // Token is valid but no workspace yet
        // If they have a pending invite, don't force workspace creation
        const pendingRedirect = sessionStorage.getItem("postLoginRedirect");
        if (pendingRedirect && pendingRedirect.startsWith("/invite")) {
          setAuthState("ready");
          sessionStorage.removeItem("postLoginRedirect");
          router.replace(pendingRedirect);
          return;
        }

        setAuthState("needs-workspace");
      } catch {
        // Network error (server down, CORS, etc.) — show login
        clearToken();
        setAuthState("unauthenticated");
      }
    }

    resolve();
  }, [router]);

  // Loading state
  if (authState === "checking" || authState === "ready") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="animate-pulse text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Skeleton dashboard behind the modal */}
      <DashboardSidebar />
      <DashboardTable />

      {/* Auth modal — shows login or workspace step based on state */}
      <AuthModal isAuthenticated={authState === "needs-workspace"} />
    </div>
  );
}
