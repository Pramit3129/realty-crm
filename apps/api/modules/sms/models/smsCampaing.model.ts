import mongoose from "mongoose";

const smsCampaingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  steps: [{
    stepIndex: { type: Number, required: true },
    delaySeconds: { type: Number, required: true },
    message: { type: String, required: true }
  }],
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export const SMSCampaign = mongoose.model('SMSCampaign', smsCampaingSchema);