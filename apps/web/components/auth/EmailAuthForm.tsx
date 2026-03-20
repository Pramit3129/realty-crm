"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { API_BASE_URL, setToken } from "@/lib/auth";

// ── Password rules (must match the backend zod schema) ────────────────
const PASSWORD_RULES = [
  {
    label: "6–32 characters",
    test: (p: string) => p.length >= 6 && p.length <= 32,
  },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  {
    label: "One special character",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

// ── Props ─────────────────────────────────────────────────────────────
interface EmailAuthFormProps {
  /** Go back to the main auth options (Google / Email) */
  onBack: () => void;
  /** Called after successful login or register */
  onSuccess: () => void;
}

// ── EmailAuthForm Component ───────────────────────────────────────────
// Toggle between "Sign In" and "Create Account".
// Shows inline password-strength hints when registering.

export default function EmailAuthForm({
  onBack,
  onSuccess,
}: EmailAuthFormProps) {
  // ── State ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  // ── Derived ─────────────────────────────────────────────────────────
  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));

  const canSubmit = isRegister
    ? name.trim().length >= 3 && email.trim() && allRulesPass
    : email.trim() && password.length >= 6;

  // ── Handlers ────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError("");
    setIsSubmitting(true);

    const endpoint = isRegister ? "/auth/register" : "/auth/login";
    const body = isRegister
      ? { name: name.trim(), email: email.trim().toLowerCase(), password }
      : { email: email.trim().toLowerCase(), password };

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // so refreshToken cookie is set
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // Show validation errors or server message
        if (data.errors?.fieldErrors) {
          const msgs = Object.values(data.errors.fieldErrors).flat();
          setError((msgs as string[]).join(". "));
        } else {
          setError(data.message || "Something went wrong");
        }
        return;
      }

      // Store token & notify parent
      setToken(data.accessToken);
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="flex w-full flex-col gap-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>All sign-in options</span>
      </button>

      {/* Heading */}
      <div className="text-center">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {isRegister ? "Create your account" : "Sign in with email"}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isRegister
            ? "Fill in your details to get started"
            : "Enter your credentials to continue"}
        </p>
      </div>

      {/* Name field (register only) */}
      {isRegister && (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
            Full Name
          </label>
          <Input
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-border/60 bg-background/50 py-5 transition-colors focus:border-primary/60"
            autoFocus
          />
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
          Email
        </label>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-border/60 bg-background/50 py-5 transition-colors focus:border-primary/60"
          autoFocus={!isRegister}
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
          Password
        </label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSubmit && handleSubmit()}
            className="border-border/60 bg-background/50 py-5 pr-10 transition-colors focus:border-primary/60"
          />
          {/* Toggle password visibility */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Password strength hints (register only, shown when typing) */}
      {isRegister && password.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-accent/5 p-4 shadow-sm animate-in zoom-in-95 duration-200">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 border-b border-border/10 pb-1.5 leading-none">
            Password requirements
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {PASSWORD_RULES.map((rule) => {
              const passes = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    passes ? "text-emerald-400" : "text-muted-foreground/60"
                  }`}
                >
                  {passes ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  <span>{rule.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !canSubmit}
        className="w-full py-5 transition-all"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRegister ? (
          "Create Account"
        ) : (
          "Sign In"
        )}
      </Button>

      {/* Toggle login ↔ register */}
      <Separator className="opacity-30" />
      <p className="text-center text-xs text-muted-foreground">
        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={toggleMode}
          className="font-medium text-primary transition-colors hover:underline"
        >
          {isRegister ? "Sign in" : "Create one"}
        </button>
      </p>
    </div>
  );
}
