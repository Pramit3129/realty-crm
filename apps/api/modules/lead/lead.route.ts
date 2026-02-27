import express from "express";
import { createLead, getLeads, updateLead, deleteLead, getLeadDetails, addLeads } from "./lead.controller";
const router = express.Router();
import requireAuth from "../../shared/middleware/requireAuth";


router.get("/health", (req, res) => {
    res.send("Lead Route running properly");
});

router.use(requireAuth);

router.post("/create", createLead);
router.post("/addLeads", addLeads);
router.get("/workspace/:workspaceId", getLeads);
router.get("/details/:id", getLeadDetails);
router.put("/details/:id", updateLead);
router.delete("/details/:id", deleteLead);

export default router;
