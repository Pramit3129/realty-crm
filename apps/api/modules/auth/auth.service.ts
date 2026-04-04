import bcrypt from "bcryptjs";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../shared/config/env.config";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../shared/utils/token";
import { userService } from "../user/user.service";
import { emailIntegrationService } from "../emailIntegration/emailIntegration.service";
import {
  Subscription,
  FREE_PLAN,
} from "../paymentIntegration/subscription.model";
import type { UserResponse } from "../user/user.types";

function getGoogleClient(): OAuth2Client {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI
  ) {
    throw new Error(
      "Google client ID, client secret, or redirect URI not configured",
    );
  }
  return new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  });
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  tokens: AuthTokens;
  user: UserResponse;
}

class AuthService {
  // ── Register ──────────────────────────────────────────────────────
  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResult> {
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      throw { status: 400, message: "User already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userService.createUser({
      name,
      email,
      password: hashedPassword,
    });

    const freeSub =
      (await Subscription.findOne({ planId: FREE_PLAN.planId })) ??
      (await Subscription.create(FREE_PLAN));
    await userService.updateUser(String(user._id), {
      subscriptionId: freeSub._id,
    });
    user.subscriptionId = freeSub._id;

    const tokens = this.generateTokens(
      String(user._id),
      user.role,
      user.tokenVersion,
    );

    return { tokens, user: userService.toResponse(user) };
  }

  // ── Login ─────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await userService.findByEmail(email);
    if (!user) {
      throw { status: 404, message: "User not found" };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw { status: 401, message: "Invalid password" };
    }

    const tokens = this.generateTokens(
      String(user._id),
      user.role,
      user.tokenVersion,
    );

    return { tokens, user: userService.toResponse(user) };
  }

  // ── Google OAuth: generate consent URL ────────────────────────────
  getGoogleAuthUrl(): string {
    const client = getGoogleClient();
    return client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "openid",
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
      ],
    });
  }

  // ── Google OAuth: handle callback ─────────────────────────────────
  async googleCallback(code: string): Promise<AuthResult> {
    const client = getGoogleClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw { status: 400, message: "Invalid authorization code" };
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw { status: 400, message: "Invalid Google token" };
    }

    const email = payload.email;
    const emailVerified = payload.email_verified;

    if (!email || !emailVerified) {
      throw {
        status: 400,
        message: "Google email account not verified",
      };
    }

    const name =
      payload.name ||
      `${payload.given_name || ""} ${payload.family_name || ""}`.trim() ||
      "User";
    const avatarUrl = payload.picture;

    let user = await userService.findByEmail(email);
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await userService.createUser({
        name,
        email,
        password: hashedPassword,
        role: "user",
      });

      // Assign the shared free subscription to every new Google user (create it only once)
      const freeSub =
        (await Subscription.findOne({ planId: FREE_PLAN.planId })) ??
        (await Subscription.create(FREE_PLAN));
      await userService.updateUser(String(user._id), {
        subscriptionId: freeSub._id,
      });
      user.subscriptionId = freeSub._id;
    }

    if (avatarUrl && user.avatarUrl !== avatarUrl) {
      await userService.updateUser(String(user._id), { avatarUrl });
      user.avatarUrl = avatarUrl;
    }

    // Create or update email integration if we have refresh_token (offline access)
    if (tokens.refresh_token) {
      const response = await emailIntegrationService.createOrUpdateIntegration(
        String(user._id),
        tokens,
      );
    }

    const authTokens = this.generateTokens(
      String(user._id),
      user.role,
      user.tokenVersion,
    );

    return { tokens: authTokens, user: userService.toResponse(user) };
  }

  // ── Refresh ───────────────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }> {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw { status: 401, message: "Invalid refresh token" };
    }

    const user = await userService.findById(payload.id);
    if (!user) {
      throw { status: 400, message: "User not found" };
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw { status: 401, message: "Invalid refresh token" };
    }

    const tokens = this.generateTokens(
      String(user._id),
      user.role,
      user.tokenVersion,
    );

    return { ...tokens, user: userService.toResponse(user) };
  }

  // ── Helpers ───────────────────────────────────────────────────────
  private generateTokens(
    userId: string,
    role: "user" | "admin",
    tokenVersion: number,
  ): AuthTokens {
    return {
      accessToken: generateAccessToken(userId, role, tokenVersion),
      refreshToken: generateRefreshToken(userId, tokenVersion),
    };
  }
}

export const authService = new AuthService();
