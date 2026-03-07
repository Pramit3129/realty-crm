import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { pipelineStageService } from "./pipelineStage.service";
import {
    createPipelineStageSchema,
    updatePipelineStageSchema,
    getPipelineStageSchema,
    getStagesByPipelineSchema,
    reorderStagesSchema,
    moveLeadSchema,
} from "./pipelineStage.types";

// ── Standard CRUD ─────────────────────────────────────────────────────

export const createPipelineStage = async (req: Request, res: Response) => {
    try {
        const data = createPipelineStageSchema.parse(req.body);
        const stage = await pipelineStageService.createStage(data);
        res.status(201).json(stage);
    } catch (error) {
        res.status(500).json({ message: "Failed to create pipeline stage", error });
    }
};

export const getStagesByPipeline = async (req: Request, res: Response) => {
    try {
        const { pipelineId } = getStagesByPipelineSchema.parse(req.params);
        const stages = await pipelineStageService.getStagesByPipeline(pipelineId);
        res.status(200).json(stages);
    } catch (error) {
        res.status(500).json({ message: "Failed to get pipeline stages", error });
    }
};

export const getStageDetails = async (req: Request, res: Response) => {
    try {
        const { id } = getPipelineStageSchema.parse(req.params);
        const stage = await pipelineStageService.getStageDetails(id);
        if (!stage) {
            res.status(404).json({ message: "Stage not found" });
            return;
        }
        res.status(200).json(stage);
    } catch (error) {
        res.status(500).json({ message: "Failed to get stage details", error });
    }
};

export const updatePipelineStage = async (req: Request, res: Response) => {
    try {
        const { id } = getPipelineStageSchema.parse(req.params);
        const data = updatePipelineStageSchema.parse(req.body);
        const stage = await pipelineStageService.updateStage(id, data);
        if (!stage) {
            res.status(404).json({ message: "Stage not found" });
            return;
        }
        res.status(200).json(stage);
    } catch (error) {
        res.status(500).json({ message: "Failed to update pipeline stage", error });
    }
};

export const deletePipelineStage = async (req: Request, res: Response) => {
    try {
        const { id } = getPipelineStageSchema.parse(req.params);
        const stage = await pipelineStageService.deleteStage(id);
        if (!stage) {
            res.status(404).json({ message: "Stage not found" });
            return;
        }
        res.status(200).json(stage);
    } catch (error) {
        res.status(500).json({ message: "Failed to delete pipeline stage", error });
    }
};

// ── Kanban-Specific Endpoints ─────────────────────────────────────────

/** GET /kanban/:pipelineId — full board with leads per stage */
export const getKanbanBoard = async (req: Request, res: Response) => {
    try {
        const authUser = req as AuthenticatedRequest;
        const { pipelineId } = getStagesByPipelineSchema.parse(req.params);
        const board = await pipelineStageService.getKanbanBoard(pipelineId, authUser.user.id);
        res.status(200).json(board);
    } catch (error) {
        res.status(500).json({ message: "Failed to get kanban board", error });
    }
};

/** GET /details/:id/leads — single stage with its leads */
export const getStageWithLeads = async (req: Request, res: Response) => {
    try {
        const authUser = req as AuthenticatedRequest;
        const { id } = getPipelineStageSchema.parse(req.params);
        const result = await pipelineStageService.getStageWithLeads(id, authUser.user.id);
        if (!result) {
            res.status(404).json({ message: "Stage not found" });
            return;
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: "Failed to get stage with leads", error });
    }
};

/** PUT /reorder — bulk reorder stages (drag column in Kanban) */
export const reorderStages = async (req: Request, res: Response) => {
    try {
        const { pipelineId, stageOrder } = reorderStagesSchema.parse(req.body);
        const stages = await pipelineStageService.reorderStages(pipelineId, stageOrder);
        res.status(200).json(stages);
    } catch (error) {
        res.status(500).json({ message: "Failed to reorder stages", error });
    }
};

/** PUT /move-lead — move a lead to a different stage (drag card in Kanban) */
export const moveLead = async (req: Request, res: Response) => {
    try {
        const { leadId, targetStageId } = moveLeadSchema.parse(req.body);
        const lead = await pipelineStageService.moveLeadToStage(leadId, targetStageId);
        if (!lead) {
            res.status(404).json({ message: "Stage or lead not found" });
            return;
        }
        res.status(200).json(lead);
    } catch (error) {
        res.status(500).json({ message: "Failed to move lead", error });
    }
};
