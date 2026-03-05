import mongoose from "mongoose";

const campaingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ["created", "running", "paused", "completed"], default: "created" },
    userId: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    workspaceId: {
        required: true,
        type: mongoose.Schema.Types.ObjectId,
        ref: "Workspace",
    },
}, { timestamps: true });

campaingSchema.index({ workspaceId: 1, userId: 1 });
campaingSchema.index({ _id: 1, userId: 1 });

export const Campaing = mongoose.model("Campaing", campaingSchema);