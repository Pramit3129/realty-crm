import { PipelineStage } from "./pipelineStage.model";
import { Lead } from "../lead/lead.model";

export class PipelineStageService {
    async createStage(data: {
        name: string;
        description?: string;
        pipelineId: string;
        workspaceId: string;
        stageNumber: number;
        probability: number;
        isFinal: boolean;
        colorIndex?: number;
    }) {
        const stage = await PipelineStage.create(data);
        return stage;
    }

    async getStagesByPipeline(pipelineId: string) {
        const stages = await PipelineStage.find({ pipelineId }).sort({ stageNumber: 1 });
        return stages;
    }

    async getStageDetails(id: string) {
        const stage = await PipelineStage.findById(id);
        return stage;
    }

    /** Get a stage along with all leads currently in it (Kanban column data) */
    async getStageWithLeads(id: string, realtorId: string) {
        const stage = await PipelineStage.findById(id);
        if (!stage) return null;
        const leads = await Lead.find({ stageId: stage._id, realtorId });
        return { ...stage.toObject(), leads };
    }

    async updateStage(id: string, data: Partial<{ name: string; description: string; probability: number; isFinal: boolean }>) {
        const stage = await PipelineStage.findByIdAndUpdate(id, data, { new: true });
        return stage;
    }

    async deleteStage(id: string) {
        const stage = await PipelineStage.findByIdAndDelete(id);
        return stage;
    }

    /** Reorder stages — accepts an ordered array of stage IDs and updates stageNumber accordingly */
    async reorderStages(pipelineId: string, stageOrder: string[]) {
        const bulkOps = stageOrder.map((stageId, index) => ({
            updateOne: {
                filter: { _id: stageId, pipelineId },
                update: { $set: { stageNumber: index + 1 } },
            },
        }));
        await PipelineStage.bulkWrite(bulkOps);
        return this.getStagesByPipeline(pipelineId);
    }

    /** Move a lead to a different stage (Kanban card drag) — also syncs lead.status to stage name */
    async moveLeadToStage(leadId: string, targetStageId: string) {
        const stage = await PipelineStage.findById(targetStageId);
        if (!stage) return null;
        const lead = await Lead.findByIdAndUpdate(
            leadId,
            { stageId: targetStageId, status: stage.name },
            { new: true }
        );
        return lead;
    }

    /** Get full Kanban board: all stages for a pipeline, each populated with their leads */
    async getKanbanBoard(pipelineId: string, realtorId: string) {
        const stages = await PipelineStage.find({ pipelineId }).sort({ stageNumber: 1 }).lean();
        const stageIds = stages.map((s) => s._id);
        const leads = await Lead.find({ stageId: { $in: stageIds }, realtorId }).lean();

        return stages.map((stage) => ({
            ...stage,
            leads: leads.filter((lead) => lead.stageId?.toString() === stage._id.toString()),
        }));
    }
}

export const pipelineStageService = new PipelineStageService();
