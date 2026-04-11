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
    createSmsCampaign,
    getSmsCampaigns,
    getSmsCampaignById,
    updateSmsCampaign,
    deleteSmsCampaign,
    addStep,
    updateStep,
    deleteStep,
} from "./sms.controller";

const router = express.Router();

// ── Health Check ──────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
    res.send("SMS Route running properly");
});

// ── All routes below require authentication ──────────────────────────
router.use(requireAuth);

// ── Onboarding & Enrollment ──────────────────────────────────────────
router.post("/onboard", onboardUser);
router.post("/assign", assignCampaing);

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
