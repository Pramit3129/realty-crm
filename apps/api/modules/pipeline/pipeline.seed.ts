import { Pipeline } from "./pipeline.model";
import { PipelineStage } from "../pipelineStage/pipelineStage.model";

export const BUYER_STAGES = [
    { name: "New Inquiry", description: "Lead has just come in", probability: 10, colorIndex: 0 },
    { name: "Contacted", description: "Initial contact has been made", probability: 15, colorIndex: 1 },
    { name: "Qualified", description: "Lead is qualified and ready to proceed", probability: 25, colorIndex: 2 },
    { name: "Active Search", description: "Actively searching for properties", probability: 35, colorIndex: 3 },
    { name: "Showing Scheduled", description: "Property showings have been scheduled", probability: 45, colorIndex: 4 },
    { name: "Offer Preparing", description: "Preparing an offer for the property", probability: 55, colorIndex: 5 },
    { name: "Offer Submitted", description: "An offer has been submitted", probability: 70, colorIndex: 6 },
    { name: "Under Contract", description: "Deal is under contract", probability: 85, colorIndex: 7 },
    { name: "Closed Won", description: "Deal has been closed successfully", probability: 100, isFinal: true, colorIndex: 8 },
    { name: "Lost", description: "Lead was lost", probability: 0, isFinal: true, colorIndex: 9 },
];

export const SELLER_STAGES = [
    { name: "New Inquiry", description: "New seller inquiry received", probability: 10, colorIndex: 0 },
    { name: "Consultation Scheduled", description: "Consultation meeting has been scheduled", probability: 20, colorIndex: 1 },
    { name: "Listing Agreement Signed", description: "Listing agreement has been signed", probability: 35, colorIndex: 2 },
    { name: "Property Live", description: "Property is live on the market", probability: 50, colorIndex: 3 },
    { name: "Offer Received", description: "An offer has been received", probability: 65, colorIndex: 4 },
    { name: "Under Contract", description: "Deal is under contract", probability: 85, colorIndex: 7 },
    { name: "Closed Won", description: "Deal has been closed successfully", probability: 100, isFinal: true, colorIndex: 8 },
    { name: "Lost", description: "Listing was lost", probability: 0, isFinal: true, colorIndex: 9 },
];

/**
 * Ensures default BUYER and SELLER pipelines exist for a workspace.
 * If they don't exist, creates them along with their default stages.
 * Returns the pipeline IDs and the first stage ID for each pipeline.
 */
export async function ensureDefaultPipelines(workspaceId: string, realtorId: string) {
    let buyerPipeline = await Pipeline.findOne({ workspaceId, type: "BUYER" });
    let sellerPipeline = await Pipeline.findOne({ workspaceId, type: "SELLER" });

    if (!buyerPipeline) {
        buyerPipeline = await Pipeline.create({
            name: "Buyer Pipeline",
            type: "BUYER",
            workspaceId,
            realtorId,
        });
        await PipelineStage.insertMany(
            BUYER_STAGES.map((stage, index) => ({
                ...stage,
                pipelineId: buyerPipeline!._id,
                workspaceId,
                stageNumber: index + 1,
                isFinal: stage.isFinal ?? false,
                colorIndex: stage.colorIndex ?? (index % 10),
            }))
        );
    }

    if (!sellerPipeline) {
        sellerPipeline = await Pipeline.create({
            name: "Seller Pipeline",
            type: "SELLER",
            workspaceId,
            realtorId,
        });
        await PipelineStage.insertMany(
            SELLER_STAGES.map((stage, index) => ({
                ...stage,
                pipelineId: sellerPipeline!._id,
                workspaceId,
                stageNumber: index + 1,
                isFinal: stage.isFinal ?? false,
                colorIndex: stage.colorIndex ?? (index % 10),
            }))
        );
    }

    // Get the first stage of each pipeline
    const buyerFirstStage = await PipelineStage.findOne({ pipelineId: buyerPipeline._id }).sort({ stageNumber: 1 });
    const sellerFirstStage = await PipelineStage.findOne({ pipelineId: sellerPipeline._id }).sort({ stageNumber: 1 });

    return {
        buyer: { pipelineId: buyerPipeline._id, firstStageId: buyerFirstStage?._id },
        seller: { pipelineId: sellerPipeline._id, firstStageId: sellerFirstStage?._id },
    };
}
