import express from "express";
import { getPaymentUrl, stripeWebhook, createPortalSessionHandler } from "./payment.controller";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";

const router = express.Router();

router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

router.post("/createCheckoutSession", requireAuth, getPaymentUrl);
router.post("/createPortalSession", requireAuth, requirePro, createPortalSessionHandler);

export default router;
