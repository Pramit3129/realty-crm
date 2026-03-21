import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true,
  },
  key: {
    type: String,
    required: true,
    unique: true,
  },
  domain: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

apiKeySchema.index({ user: 1, workspace: 1 }, { unique: true });

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
