"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";

// ── Auth Callback Page ────────────────────────────────────────────────
// Google OAuth redirects here after login:
//   /auth/callback?token=xxx   → success
//   /auth/callback?error=xxx   → failure
//
// On success we store the token and send the user to the home page,
// which will then show the workspace-creation step.

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (token) {
      // Store the access token and go home
      setToken(token);
      router.replace("/");
    } else if (error) {
      console.error("Auth error:", error);
      // Go back to login so the user can retry
      router.replace("/");
    } else {
      // No token and no error – shouldn't happen, go home
      router.replace("/");
    }
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="animate-pulse text-muted-foreground">Signing you in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="animate-pulse text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
