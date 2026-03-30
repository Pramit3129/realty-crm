import type { Request, Response } from "express";
import { env } from "../../shared/config/env.config";
import { registerSchema, loginSchema } from "./auth.types";
import { authService } from "./auth.service";
import { emailIntegrationService } from "../emailIntegration/emailIntegration.service";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.AUTH_COOKIE_SAME_SITE as "lax" | "strict" | "none",
  maxAge: env.REFRESH_COOKIE_MAX_AGE_MS,
  path: "/",
  ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
};

// ── POST /auth/register ──────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
      return;
    }

    const { name, email, password } = result.data;
    const { tokens, user } = await authService.register(
      name,
      email,
      password,
    );

    res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(201).json({
      message: "User registered successfully",
      accessToken: tokens.accessToken,
      user,
    });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
}

// ── POST /auth/login ─────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.error.flatten(),
      });
      return;
    }

    const { email, password } = result.data;
    const { tokens, user } = await authService.login(email, password);

    res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      message: "Login successful",
      accessToken: tokens.accessToken,
      user,
    });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
}

// ── POST /auth/refresh ───────────────────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      res.status(401).json({ message: "Refresh token missing" });
      return;
    }

    const { accessToken, refreshToken, user } =
      await authService.refresh(token);

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      message: "Token refreshed",
      accessToken,
      user,
    });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Internal server error" });
  }
}

// ── POST /auth/logout ────────────────────────────────────────────────
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie("refreshToken", {
    path: "/",
    ...(env.AUTH_COOKIE_DOMAIN ? { domain: env.AUTH_COOKIE_DOMAIN } : {}),
  });
  res.status(200).json({ message: "Logout successful" });
}

// ── GET /auth/google ─────────────────────────────────────────────────
export async function googleAuthStart(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const url = authService.getGoogleAuthUrl();
    res.redirect(url);
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}

// ── GET /auth/google/callback ────────────────────────────────────────
export async function googleAuthCallback(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.redirect(
        `${env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent("Authorization code is required")}`,
      );
      return;
    }

    let stateObj: any = null;
    try {
      if (req.query.state) {
        stateObj = JSON.parse(req.query.state as string);
      }
    } catch (e) {
      console.error(`Error parsing state: ${e}`);
    }

    if (stateObj && stateObj.intent === "email_integration") {
      await emailIntegrationService.handleCallback(code, stateObj.userId);
      res.redirect(`${env.FRONTEND_URL}/?email_connected=true`);
      return;
    }

    const { tokens, user } = await authService.googleCallback(code);

    res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    res.redirect(
      `${env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`,
    );
  } catch (error: any) {
    const message = error.message || "Authentication failed";
    res.redirect(
      `${env.FRONTEND_URL}/auth/callback?error=${encodeURIComponent(message)}`,
    );
  }
}
