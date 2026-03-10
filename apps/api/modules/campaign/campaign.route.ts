import express from "express";
import {
  createCampaing,
  updateCampaing,
  getCampaingDetails,
  getCampaings,
  deleteCampaing,
  createCampaignStep,
  startCampaign,
  deleteCampaignStep,
  getCampaignSteps,
  updateCampaignStep,
  trackEmailOpen
} from "./campaign.controller";
import requireAuth from "../../shared/middleware/requireAuth";

const router = express.Router();

router.get("/health", (req, res) => {
  res.send("Campaing Route running properly");
});

router.get("/track/:batchId/:leadId", trackEmailOpen);

router.use(requireAuth);

router.post("/create", createCampaing);
router.put("/update", updateCampaing);
router.post('/step/create', createCampaignStep);
router.post('/start', startCampaign);
router.put('/step/:stepId', updateCampaignStep);
router.delete('/step/:stepId', deleteCampaignStep);

router.get("/details/:campaignId", getCampaingDetails);
router.get('/:campaignId/steps', getCampaignSteps);
router.get("/:workspaceId", getCampaings);
router.delete("/:campaignId", deleteCampaing);

export default router;
