import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/token";
import { User } from "../../modules/user/user.model";

export interface AuthenticatedUser {
    _id: string;
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const token = authHeader.split("Bearer ")[1];
        if (!token) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const payload = verifyAccessToken(token);
        if (!payload) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const user = await User.findById(payload.id);
        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (user.tokenVersion !== payload.tokenVersion) {
            res.status(401).json({ message: "Token expired, please login again" });
            return;
        }

        (req as AuthenticatedRequest).user = {
            _id: user._id.toString(),
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };

        next();
    } catch {
        res.status(401).json({ message: "Unauthorized" });
    }
}

export default requireAuth;
