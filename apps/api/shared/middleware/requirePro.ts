import type { NextFunction, Request, Response } from "express";
import { User } from "../../modules/user/user.model";
import { Subscription } from "../../modules/paymentIntegration/subscription.model";
import type { AuthenticatedRequest } from "./requireAuth";

async function requirePro(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.user || !authReq.user.id) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const user = await User.findById(authReq.user.id).select("subscriptionId");

        if (!user || !user.subscriptionId) {
            res.status(403).json({ message: "This action requires a Pro subscription" });
            return;
        }

        const subscription = await Subscription.findById(user.subscriptionId);

        if (!subscription || subscription.planName.toLowerCase() === "free") {
            res.status(403).json({ message: "This action requires a Pro subscription" });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export default requirePro;
