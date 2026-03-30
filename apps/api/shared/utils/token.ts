import jwt from "jsonwebtoken";
import { env } from "../config/env.config";

type TokenExpiry = jwt.SignOptions["expiresIn"];

export interface AccessTokenPayload {
    id: string;
    role: "user" | "admin";
    tokenVersion: number;
}

export interface RefreshTokenPayload {
    id: string;
    tokenVersion: number;
}

export function generateAccessToken(
    userId: string,
    role: "user" | "admin",
    tokenVersion: number,
): string {
    const payload: AccessTokenPayload = { id: userId, role, tokenVersion };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN as TokenExpiry,
    });
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
        return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch {
        return null;
    }
}

export function generateRefreshToken(
    userId: string,
    tokenVersion: number,
): string {
    const payload: RefreshTokenPayload = { id: userId, tokenVersion };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRES_IN as TokenExpiry,
    });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
        return jwt.verify(
            token,
            env.JWT_REFRESH_SECRET,
        ) as RefreshTokenPayload;
    } catch {
        return null;
    }
}

export function generateInviteToken(workspaceId: string): string {
    return jwt.sign({ workspaceId }, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_INVITE_EXPIRES_IN as TokenExpiry,
    });
}

export function verifyInviteToken(token: string): { workspaceId: string } | null {
    try {
        return jwt.verify(token, env.JWT_ACCESS_SECRET) as { workspaceId: string };
    } catch {
        return null;
    }
}
