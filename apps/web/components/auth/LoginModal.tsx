"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { API_BASE_URL, getToken } from "@/lib/auth";
import EmailAuthForm from "./EmailAuthForm";

// ── Google Icon (inline SVG) ──────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ── Props ─────────────────────────────────────────────────────────────
interface AuthModalProps {
  /** Whether the user already has a valid token */
  isAuthenticated: boolean;
}

// ── View types ────────────────────────────────────────────────────────
// "providers"  → Google / Email buttons
// "email"      → Email auth form (login or register)
// "workspace"  → Workspace creation (shown after auth)
type ModalView = "providers" | "email" | "workspace";

// ── AuthModal Component ───────────────────────────────────────────────

export default function AuthModal({ isAuthenticated }: AuthModalProps) {
  const [view, setView] = useState<ModalView>(
    isAuthenticated ? "workspace" : "providers",
  );
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ── Handlers ────────────────────────────────────────────────────────

  /** Redirect the browser to the backend Google OAuth endpoint */
  function handleGoogleLogin() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  /** Called after email login/register succeeds */
  function handleEmailSuccess() {
    window.location.reload();
  }

  /** Submit the workspace name to the backend */
  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) {
      setError("Workspace name is required");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/workspace/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to create workspace");
        return;
      }

      // Workspace created – go to dashboard
      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Heading helpers ─────────────────────────────────────────────────
  function getHeading() {
    switch (view) {
      case "providers":
        return "Welcome to RealtyCRM";
      case "email":
        return ""; // EmailAuthForm renders its own heading
      case "workspace":
        return "Create your Workspace";
    }
  }

  function getSubheading() {
    switch (view) {
      case "providers":
        return "Sign in to manage your real estate pipeline";
      case "email":
        return "";
      case "workspace":
        return "Give your workspace a name to get started";
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="relative w-full max-w-md overflow-hidden border-border/50 bg-card shadow-2xl shadow-black/40">
        {/* Subtle gradient glow at the top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <CardContent className="flex flex-col items-center gap-6 px-8 pt-10 pb-6">
          {/* Logo */}
          <div className="rounded-xl border border-border/50 bg-background/50 p-3 shadow-sm">
            <Image
              src="/logo.png"
              alt="RealtyCRM Logo"
              width={40}
              height={40}
              className="rounded-md"
            />
          </div>

          {/* Heading (hidden for email view — it has its own) */}
          {view !== "email" && (
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {getHeading()}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {getSubheading()}
              </p>
            </div>
          )}

          {/* ── Providers view ──────────────────────────────────────── */}
          {view === "providers" && (
            <div className="flex w-full flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
                className="group flex w-full items-center justify-center gap-2.5 border-border/60 bg-background/50 py-5 transition-all hover:border-border hover:bg-accent/50"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => setView("email")}
                className="group flex w-full items-center justify-center gap-2.5 border-border/60 bg-background/50 py-5 transition-all hover:border-border hover:bg-accent/50"
              >
                <Mail className="h-4 w-4" />
                <span>Continue with Email</span>
              </Button>
            </div>
          )}

          {/* ── Email auth view ─────────────────────────────────────── */}
          {view === "email" && (
            <EmailAuthForm
              onBack={() => setView("providers")}
              onSuccess={handleEmailSuccess}
            />
          )}

          {/* ── Workspace view ──────────────────────────────────────── */}
          {view === "workspace" && (
            <div className="flex w-full flex-col gap-4">
              <div className="space-y-2">
                <Input
                  placeholder="e.g. My Real Estate Team"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateWorkspace()
                  }
                  className="border-border/60 bg-background/50 py-5 transition-colors focus:border-primary/60"
                  autoFocus
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              <Button
                onClick={handleCreateWorkspace}
                disabled={isSubmitting || !workspaceName.trim()}
                className="w-full py-5 transition-all"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Create Workspace</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>

        {/* Footer */}
        <Separator className="opacity-50" />
        <CardFooter className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground">
          <a
            href="#"
            className="transition-colors hover:text-foreground hover:underline"
          >
            Privacy Policy
          </a>
          <span className="text-muted-foreground/50">•</span>
          <a
            href="#"
            className="transition-colors hover:text-foreground hover:underline"
          >
            Terms of Service
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
