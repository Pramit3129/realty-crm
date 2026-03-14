import { Router } from "express";
import {
    getGoogleAuthUrl,
    getIntegrationStatus,
    receiveWebhook,
    sendEmailToLead,
    processWebhookWorker,
    renewWatches,
} from "./emailIntegration.controller";
import requireAuth from "../../shared/middleware/requireAuth";

const router = Router();

// ── Public webhook endpoints (authenticated via Pub/Sub JWT or internal secret) ──
router.post("/webhook/receive", receiveWebhook as any);
router.post("/webhook/worker", processWebhookWorker as any);
router.post("/webhook/renew-watches", renewWatches as any);

// ── Protected routes (authenticated via user JWT) ──
router.use(requireAuth);

router.get("/google/auth-url", getGoogleAuthUrl as any);
router.get("/status", getIntegrationStatus as any);
router.post("/send", sendEmailToLead as any);

export default router;
