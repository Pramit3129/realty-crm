"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTable from "@/components/dashboard/DashboardTable";
import AuthModal from "@/components/auth/LoginModal";
import {
  isLoggedIn,
  clearToken,
  tryRefreshToken,
} from "@/lib/auth";
import { api } from "@/lib/api";

// ── Auth state machine ───────────────────────────────────────────────
// "checking"       → loading spinner while we figure things out
// "unauthenticated"→ show login modal (providers / email form)
// "needs-subscription" → show pricing modal
// "needs-workspace"→ show workspace-creation modal
// "ready"          → redirect to /dashboard (user has token + workspace)
type AuthState = "checking" | "unauthenticated" | "needs-subscription" | "needs-workspace" | "ready";

export default function Home() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    async function resolve() {
      // 1. No local token → attempt refresh before treating as logged out
      if (!isLoggedIn()) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
          setAuthState("unauthenticated");
          return;
        }
      }

      // 2. Has token → check for workspace (api handles refresh)
      try {
        const userRes = await api("/user/me");
        if (!userRes.ok) {
          clearToken();
          setAuthState("unauthenticated");
          return;
        }
        const userData = await userRes.json();
        const user = userData.user;

        if (!user.isSubscribed) {
          setAuthState("needs-subscription");
          return;
        }

        const res = await api("/workspace");

        if (!res.ok) {
          clearToken();
          setAuthState("unauthenticated");
          return;
        }

        // Success — check if workspace exists
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
      <AuthModal 
        isAuthenticated={authState === "needs-workspace" || authState === "needs-subscription"} 
        initialView={authState === "needs-subscription" ? "pricing" : (authState === "needs-workspace" ? "workspace" : undefined)}
      />
    </div>
  );
}
