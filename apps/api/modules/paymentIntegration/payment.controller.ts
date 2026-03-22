import type { Request, Response } from "express";
import stripe from "stripe";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { PaymentService } from "./payment.service";
const Stripe = new stripe(process.env.STRIPE_SECRET_KEY!);

export const getPaymentUrl = async (
     req: Request,
     res: Response,
) => {
     try {
          const authUser = req as AuthenticatedRequest;
          const { priceId } = req.body;
          const url = await PaymentService.createSessionURL( authUser.user.id, priceId);
          res.json({ url: url });
     } catch (error: any) {
          res.status(500).json({ success: false, error: error.message });
     }
};
