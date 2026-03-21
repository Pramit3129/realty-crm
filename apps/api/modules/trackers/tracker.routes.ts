import express from "express";
import rateLimit from "express-rate-limit";
import { trackBatch, identifyVisitor, getWorkspaceEvents, getWorkspaceVisitors, generateApiKey, getTrackerDetails } from "./tracker.controller";
import requireAuth from "../../shared/middleware/requireAuth";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200
});

router.use("/track-batch", limiter);
router.use("/identify", limiter);

router.post("/track-batch", trackBatch);
router.post("/identify", identifyVisitor);

router.get("/workspace/:workspaceId/events", requireAuth, getWorkspaceEvents);
router.get("/workspace/:workspaceId/visitors", requireAuth, getWorkspaceVisitors);

router.post("/generate-api-key", requireAuth, generateApiKey);
router.get("/workspace/:workspaceId/tracker-details", requireAuth, getTrackerDetails);

export default router;