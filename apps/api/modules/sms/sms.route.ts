import express from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import { validate } from "../../shared/middleware/validate";
import {
    createSmsCampaignSchema,
    updateSmsCampaignSchema,
    addStepSchema,
    updateStepSchema,
    campaignIdParamSchema,
    stepIndexParamSchema,
} from "./sms.schema";
import {
    onboardUser,
    assignCampaing,
    assignCampaings,
    createSmsCampaign,
    getSmsCampaigns,
    getSmsCampaignById,
    updateSmsCampaign,
    deleteSmsCampaign,
    addStep,
    updateStep,
    deleteStep,
    smsWorker,
    inboundWebhook,
    statusWebhook,
    getLeadMessages,
    getSmsStatus,
    toggleSmsCampaignStatus,
} from "./sms.controller";
import requirePro from "../../shared/middleware/requirePro";

const router = express.Router();

// ── Health Check ──────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
    res.send("SMS Route running properly");
});

// ── Worker Endpoint ───────────────────────────────────────────────────
// This is protected via internal secret validation in the controller
router.post("/worker/send", smsWorker);

// ── Webhooks ──────────────────────────────────────────────────────────
// These handle incoming POST requests from Twilio
router.post("/webhook/inbound", inboundWebhook);
router.post("/webhook/status", statusWebhook);

// ── All routes below require authentication ──────────────────────────
router.use(requireAuth);
router.use(requirePro);

// ── Onboarding & Setup ───────────────────────────────────────────────
router.post("/onboard", onboardUser);
router.get("/status", getSmsStatus);
router.put("/status/toggle", toggleSmsCampaignStatus);

// ── Enrollment ───────────────────────────────────────────────────────
router.post("/assign", assignCampaing);
router.post("/assign-bulk", assignCampaings);

// ── Lead Messages ────────────────────────────────────────────────────
router.get("/lead/:leadId/messages", getLeadMessages);

// ── Campaign CRUD ────────────────────────────────────────────────────
router.post(
    "/campaign",
    validate({ body: createSmsCampaignSchema }),
    createSmsCampaign
);

router.get("/campaign", getSmsCampaigns);

router.get(
    "/campaign/:campaignId",
    validate({ params: campaignIdParamSchema }),
    getSmsCampaignById
);

router.put(
    "/campaign/:campaignId",
    validate({ params: campaignIdParamSchema, body: updateSmsCampaignSchema }),
    updateSmsCampaign
);

router.delete(
    "/campaign/:campaignId",
    validate({ params: campaignIdParamSchema }),
    deleteSmsCampaign
);

// ── Step Management ──────────────────────────────────────────────────
router.post(
    "/campaign/:campaignId/step",
    validate({ params: campaignIdParamSchema, body: addStepSchema }),
    addStep
);

router.put(
    "/campaign/:campaignId/step/:stepIndex",
    validate({ params: stepIndexParamSchema, body: updateStepSchema }),
    updateStep
);

router.delete(
    "/campaign/:campaignId/step/:stepIndex",
    validate({ params: stepIndexParamSchema }),
    deleteStep
);

export default router;
