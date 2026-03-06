import type { Request, Response } from "express";
import { Pipeline } from "./pipeline.model";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { createPipelineSchema, getPipelineDetailsSchema, getPipelinesSchema, updatePipelineSchema } from "./pipeline.types";
import { PipelineStage } from "../pipelineStage/pipelineStage.model";
import { Lead } from "../lead/lead.model";
import { BUYER_STAGES, SELLER_STAGES } from "./pipeline.seed";


export const createPipeline = async (req: Request, res: Response) => {
    try {
        console.log("Creating pipeline with body:", JSON.stringify(req.body, null, 2));
        const { name, type, workspaceId, stages } = createPipelineSchema.parse(req.body);
        const realtorId = (req as AuthenticatedRequest).user.id;
        const pipeline = await Pipeline.create({ name, type, workspaceId, realtorId });

        // Auto-create stages: use provided stages OR defaults based on type
        const stagesToCreate = (stages && stages.length > 0) 
            ? stages 
            : (type === "BUYER" ? BUYER_STAGES : SELLER_STAGES);

        console.log(`Creating ${stagesToCreate.length} stages for pipeline ${pipeline._id}`);

        await PipelineStage.insertMany(
            stagesToCreate.map((stage: any, index: number) => ({
                ...stage,
                pipelineId: pipeline._id,
                workspaceId,
                stageNumber: index + 1,
                isFinal: stage.isFinal ?? (index === stagesToCreate.length - 1 || stage.name.toLowerCase().includes("won") || stage.name.toLowerCase().includes("lost")),
                colorIndex: stage.colorIndex ?? (index % 10),
            }))
        );

        res.status(201).json(pipeline);
    } catch (error: any) {
        console.error("Pipeline creation error:", error);
        res.status(500).json({ 
            message: "Failed to create pipeline", 
            error: error.message || error,
            details: error.errors // for Zod errors
        });
    }
}

export const getPipelines = async (req: Request, res: Response) => {
    try {
        const { workspaceId } = getPipelinesSchema.parse(req.params);
        const realtorId = (req as AuthenticatedRequest).user.id;
        const pipelines = await Pipeline.find({ workspaceId, realtorId });
        res.status(200).json(pipelines);
    } catch (error) {
        res.status(500).json({ message: "Failed to get pipelines", error });
    }
}

export const getPipelineDetails = async (req: Request, res: Response) => {
    try {
        const { id } = getPipelineDetailsSchema.parse(req.params);
        const pipeline = await Pipeline.findById(id);
        res.status(200).json(pipeline);
    } catch (error) {
        res.status(500).json({ message: "Failed to get pipeline details", error });
    }
}

export const updatePipeline = async (req: Request, res: Response) => {
    try {
        const { id } = getPipelineDetailsSchema.parse(req.params);
        const { name, type } = updatePipelineSchema.parse(req.body);
        const pipeline = await Pipeline.findByIdAndUpdate(id, { name, type }, { new: true });
        res.status(200).json(pipeline);
    } catch (error) {
        res.status(500).json({ message: "Failed to update pipeline", error });
    }
}

export const deletePipeline = async (req: Request, res: Response) => {
    try {
        const { id } = getPipelineDetailsSchema.parse(req.params);
        
        // Cascading deletion
        await PipelineStage.deleteMany({ pipelineId: id });
        await Lead.deleteMany({ pipelineId: id });
        
        const pipeline = await Pipeline.findByIdAndDelete(id);
        res.status(200).json(pipeline);
    } catch (error) {
        res.status(500).json({ message: "Failed to delete pipeline", error });
    }
}