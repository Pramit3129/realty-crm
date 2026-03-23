import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { PaymentService } from "./payment.service";

export const getPaymentUrl = async (
     req: Request,
     res: Response,
) => {
     try {
          const authUser = req as AuthenticatedRequest;
          const { priceId } = req.body;
          const url = await PaymentService.createSessionURL(authUser.user.id, priceId);
          res.json({ url: url });
     } catch (error: any) {
          res.status(500).json({ success: false, error: error.message });
     }
};

export const stripeWebhook = async (
     req: Request,
     res: Response,
): Promise<void> => {
     const signature = req.headers["stripe-signature"] as string | undefined;

     if (!signature) {
          res.status(400).json({ message: "Missing Stripe-Signature header" });
          return;
     }

     try {
          // req.body is a raw Buffer here (express.raw middleware applied on this route)
          await PaymentService.handleWebhook(req.body as Buffer, signature);
          res.status(200).json({ received: true });
     } catch (error: any) {
          const status = error.status ?? 500;
          console.error("Webhook error:", error.message);
          res.status(status).json({ message: error.message });
     }
};

export const createPortalSessionHandler = async (
     req: Request,
     res: Response,
) => {
     try {
          const authUser = req as AuthenticatedRequest;
          const user = authUser.user;

     
          if (!user.stripeCustomerId) {
               res.status(400).json({ success: false, error: "User does not have an active Stripe customer ID." });
               return;
          }

          const url = await PaymentService.createPortalSession(user.stripeCustomerId);
          res.json({ url });
     } catch (error: any) {
          res.status(500).json({ success: false, error: error.message });
     }
};
