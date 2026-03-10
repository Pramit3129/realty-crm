import { Router } from "express";
import { getGoogleAuthUrl, getIntegrationStatus, sendEmailToLead } from "./emailIntegration.controller";
import requireAuth from "../../shared/middleware/requireAuth";

const router = Router();

// Protected routes below
router.use(requireAuth);

router.get("/google/auth-url", getGoogleAuthUrl as any);
router.get("/status", getIntegrationStatus as any);
router.post("/send", sendEmailToLead as any);

export default router;
