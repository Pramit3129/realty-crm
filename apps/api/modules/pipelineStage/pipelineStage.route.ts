import { Router } from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";
import {
    createPipelineStage,
    getStagesByPipeline,
    getStageDetails,
    updatePipelineStage,
    deletePipelineStage,
    getKanbanBoard,
    getStageWithLeads,
    reorderStages,
    moveLead,
} from "./pipelineStage.controller";

const router = Router();

router.get("/health", (req, res) => {
    res.send("Pipeline Stage Route running properly");
});

router.use(requireAuth);
router.use(requirePro);

// ── Standard CRUD ─────────────────────────────────────────────────────
router.post("/create", createPipelineStage);
router.get("/pipeline/:pipelineId", getStagesByPipeline);
router.get("/details/:id", getStageDetails);
router.put("/details/:id", updatePipelineStage);
router.delete("/details/:id", deletePipelineStage);

// ── Kanban-Specific ───────────────────────────────────────────────────
router.get("/kanban/:pipelineId", getKanbanBoard);
router.get("/details/:id/leads", getStageWithLeads);
router.put("/reorder", reorderStages);
router.put("/move-lead", moveLead);

export default router;
