import express from "express";
import {
  createCampaing,
  updateCampaing,
  getCampaingDetails,
  getCampaings,
  deleteCampaing,
  createCampaignStep,
  startCampaign,
  stopCampaign,
  deleteCampaignStep,
  getCampaignSteps,
  getCampaignStep,
  updateCampaignStep,
  getCampaignProgress,
  trackEmailOpen,
  unsubscribeEmail,
  getTemplates,
  createTemplate,
  deleteTemplate
} from "./campaign.controller";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";

const router = express.Router();

router.get("/health", (req, res) => {
  res.send("Campaing Route running properly");
});

router.get("/track/:batchId/:leadId", trackEmailOpen);
router.get("/unsubscribe/:leadId", unsubscribeEmail);

router.use(requireAuth);
router.use(requirePro);

router.post("/create", createCampaing);
router.put("/update", updateCampaing);
router.post('/step/create', createCampaignStep);
router.post('/start', startCampaign);
router.post('/stop', stopCampaign);
router.put('/step/:stepId', updateCampaignStep);
router.delete('/step/:stepId', deleteCampaignStep);

router.get("/details/:campaignId", getCampaingDetails);
router.get("/progress/:campaignId", getCampaignProgress);
router.get('/:campaignId/steps', getCampaignSteps);
router.get('/:campaignId/steps/:stepId', getCampaignStep);
router.get("/:workspaceId", getCampaings);
router.delete("/:campaignId", deleteCampaing);

router.get("/template/all", getTemplates);
router.post("/template", createTemplate);
router.delete("/template/:templateId", deleteTemplate);

export default router;
