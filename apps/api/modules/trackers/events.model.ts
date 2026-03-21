import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
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
  visitorId: {
    type: String,
    required: true,
  },
  leadId: {
    type: mongoose.Types.ObjectId,
    ref: "Lead",
    default: null,
  },
  event: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

eventSchema.index({ workspaceId: 1, visitorId: 1 });
eventSchema.index({ workspaceId: 1, realtorId: 1 });
eventSchema.index({ workspaceId: 1, leadId: 1 });
eventSchema.index({ workspaceId: 1, timestamp: -1 });

export const Event = mongoose.model("Event", eventSchema);
