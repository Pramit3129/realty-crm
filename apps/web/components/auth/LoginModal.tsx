"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Mail, ArrowRight, Loader2, ShieldCheck, Globe } from "lucide-react";
import { API_BASE_URL, getToken } from "@/lib/auth";
import EmailAuthForm from "./EmailAuthForm";
import { cn } from "@/lib/utils";
import OnboardingForm from "./OnboardingForm";

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

interface AuthModalProps {
  isAuthenticated: boolean;
}

type ModalView = "providers" | "email" | "workspace" | "onboarding";

export default function AuthModal({ isAuthenticated }: AuthModalProps) {
  const [view, setView] = useState<ModalView>(
    isAuthenticated ? "workspace" : "providers",
  );
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleGoogleLogin() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  function handleEmailSuccess() {
    window.location.reload();
  }

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

      setView("onboarding");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className={cn(
        "relative w-full bg-background rounded-2xl shadow-2xl border border-border/50 overflow-hidden transition-all duration-300",
        view === "onboarding" ? "max-w-xl" : "max-w-[400px]"
      )}>
        <div className="p-8 sm:p-10 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <Image 
              src="/logo.png" 
              alt="RealtyGenie Logo" 
              width={48} 
              height={48} 
              className="object-contain"
            />
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">
                {view === "providers" && "Welcome back"}
                {view === "workspace" && "Create Workspace"}
                {view === "onboarding" && "Complete Your Profile"}
              </h1>
              <p className="text-sm text-muted-foreground/80">
                {view === "providers" && "Choose how you'd like to continue"}
                {view === "workspace" && "Let's name your professional portal"}
                {view === "onboarding" && "Almost there! Just a few more details"}
              </p>
            </div>
          </div>

          <div className="w-full">
            {/* ── Providers view ──────────────────────────────────────── */}
            {view === "providers" && (
              <div className="flex w-full flex-col gap-3">
                <Button
                  onClick={handleGoogleLogin}
                  className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 transition-all font-semibold gap-3 rounded-xl shadow-lg"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setView("email")}
                  className="w-full h-12 border-border/60 bg-background/50 hover:bg-accent/50 transition-all font-semibold gap-3 rounded-xl"
                >
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Continue with Email</span>
                </Button>
                
                <p className="text-[11px] text-center text-muted-foreground/60 mt-2 px-4">
                  By continuing, you agree to our Terms & Privacy policy.
                </p>
              </div>
            )}

            {/* ── Email auth view ─────────────────────────────────────── */}
            {view === "email" && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                <EmailAuthForm
                  onBack={() => setView("providers")}
                  onSuccess={handleEmailSuccess}
                />
              </div>
            )}

            {/* ── Workspace view ──────────────────────────────────────── */}
            {view === "workspace" && (
              <div className="flex w-full flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <Input
                    placeholder="e.g. Diamond Realty Group"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                    className="h-12 border-border/60 bg-background/50 focus-visible:ring-1 rounded-xl"
                    autoFocus
                  />
                  {error && <p className="text-xs font-medium text-destructive ml-1">{error}</p>}
                </div>

                <Button
                  onClick={handleCreateWorkspace}
                  disabled={isSubmitting || !workspaceName.trim()}
                  className="w-full h-12 shadow-lg transition-all active:scale-[0.98] rounded-xl"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Setup Workspace</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* ── Onboarding view ───────────────────────────────────────── */}
            {view === "onboarding" && (
              <div className="w-full animate-in fade-in slide-in-from-right-4 duration-500">
                <OnboardingForm onComplete={() => window.location.href = "/dashboard"} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
