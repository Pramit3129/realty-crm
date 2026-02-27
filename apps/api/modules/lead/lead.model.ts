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
}, {
    timestamps: true,
});

leadSchema.index({ workspaceId: 1, realtorId: 1 });

export const Lead = mongoose.model<ILead>("Lead", leadSchema);
