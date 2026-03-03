import mongoose from "mongoose";
import type { ILead } from "./lead.types";

const leadSchema = new mongoose.Schema<ILead>({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: true
    },
    realtorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    pipelineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pipeline",
        required: true
    },
    stageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PipelineStage",
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Campaing",
    },
    status: {
        type: String,
        enum: ["new", "contacted", "converted", "lost"],
        default: "new"
    }
}, {
    timestamps: true,
});

leadSchema.index({ workspaceId: 1, realtorId: 1 });
leadSchema.index({ campaignId: 1, realtorId: 1, workspaceId: 1 });

export const Lead = mongoose.model<ILead>("Lead", leadSchema);
