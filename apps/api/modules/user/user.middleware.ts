import type { NextFunction, Request, Response } from "express";
import { Subscription, FREE_PLAN } from "../paymentIntegration/subscription.model";
import { User } from "./user.model";
import type { IUser } from "./user.types";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";

export interface ProUserRequest extends AuthenticatedRequest {
    proUser: IUser;
}

export async function requireProUser(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const authReq = req as AuthenticatedRequest;

        if (!authReq.user?._id) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const user = await User.findById(authReq.user._id).select("+subscriptionId");

        if (!user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        if (!user.subscriptionId) {
            res.status(403).json({ message: "This action requires a Pro subscription" });
            return;
        }

        const subscription = await Subscription.findById(user.subscriptionId).select("planName");

        if (
            !subscription ||
            subscription.planName.trim().toLowerCase() === FREE_PLAN.planName
        ) {
            res.status(403).json({ message: "This action requires a Pro subscription" });
            return;
        }

        (req as ProUserRequest).proUser = user;
        next();
    } catch (error) {
        console.error("requireProUser error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
