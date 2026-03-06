import mongoose from "mongoose";
import type { IPipelineStage } from "./pipelineStage.types";

const pipelineStageSchema = new mongoose.Schema<IPipelineStage>({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    pipelineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pipeline",
        required: true
    },
    workspaceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
        required: true
    },
    stageNumber: {
        type: Number,
        required: true
    },
    probability: {
        type: Number,
        required: true
    },
    isFinal: {
        type: Boolean,
        default: false
    },
    colorIndex: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
});

pipelineStageSchema.index({ pipelineId: 1, workspaceId: 1 });

export const PipelineStage = mongoose.model<IPipelineStage>("PipelineStage", pipelineStageSchema);