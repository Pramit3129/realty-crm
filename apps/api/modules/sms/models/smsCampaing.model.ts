import mongoose from "mongoose";

const smsCampaingSchema = new mongoose.Schema({
  userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  name: String,
  steps: [{
    stepIndex: Number,
    delaySeconds: Number,
    message: String
  }],
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  
});

export const SMSCampaign = mongoose.model('SMSCampaign', smsCampaingSchema);