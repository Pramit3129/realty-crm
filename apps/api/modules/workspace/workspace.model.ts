import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },  
    type: {
        type: String,
        enum: ["SOLO", "TEAM"],
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }  
}, {
    timestamps: true,
});

workspaceSchema.index({ owner: 1 });

export const Workspace = mongoose.model("Workspace", workspaceSchema);