import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
  },
  workspaceId: {
    type: mongoose.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  realtorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  leadId: {
    type: mongoose.Types.ObjectId,
    ref: "Lead",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

visitorSchema.index({ visitorId: 1, workspaceId: 1 }, { unique: true });
visitorSchema.index({ realtorId: 1 });
visitorSchema.index({ leadId: 1 });

export const Visitor = mongoose.model("Visitor", visitorSchema);