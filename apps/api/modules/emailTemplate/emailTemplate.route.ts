import express from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";
import {
  getPrebuiltTemplates,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "./emailTemplate.controller";

const router = express.Router();

router.get("/health", (_req, res) => {
  res.send("EmailTemplate Route running");
});

// Pre-built templates (no auth needed for display, but we keep it consistent)
router.get("/prebuilt", requireAuth, getPrebuiltTemplates);

router.use(requireAuth);
router.use(requirePro);

router.get("/workspace/:workspaceId", getTemplates);
router.post("/create", createTemplate);
router.put("/:templateId", updateTemplate);
router.delete("/:templateId", deleteTemplate);

export default router;
