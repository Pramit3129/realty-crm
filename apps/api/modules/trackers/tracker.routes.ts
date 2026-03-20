import express from "express";
import rateLimit from "express-rate-limit";
import { trackBatch, identifyVisitor } from "./tracker.controller";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200
});

router.use("/api/track-batch", limiter);
router.use("/api/identify", limiter);

router.post("/api/track-batch", trackBatch);
router.post("/api/identify", identifyVisitor);

export default router;