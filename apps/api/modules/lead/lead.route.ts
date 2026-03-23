import express from "express";
import { createLead, getLeads, updateLead, deleteLead, getLeadDetails, addLeads, getLeadsByCampaing, assignCampaingToLeads, getLeadEmails, getAllEmails } from "./lead.controller";
const router = express.Router();
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";


router.get("/health", (req, res) => {
    res.send("Lead Route running properly");
});

router.use(requireAuth);
router.use(requirePro);

router.post("/create", createLead);
router.post("/addLeads", addLeads);
router.get("/workspace/:workspaceId", getLeads);
router.get("/details/:id", getLeadDetails);
router.get("/details/:id/emails", getLeadEmails);
router.get("/emails", getAllEmails);
router.put("/details/:id", updateLead);
router.delete("/details/:id", deleteLead);
router.get("/campaign/:campaignId/workspace/:workspaceId", getLeadsByCampaing);
router.post("/assignCampaingToLeads", assignCampaingToLeads);


export default router;
