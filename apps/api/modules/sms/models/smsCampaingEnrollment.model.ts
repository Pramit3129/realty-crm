import mongoose from "mongoose";

const campaignEnrollmentSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'SMSCampaign', required: true },
  currentStepIndex: { type: Number, default: 0 },
  nextSmsTime: { type: Date },
  status: { 
    type: String, 
    enum: ['AWAITING_CRON', 'QUEUED_IN_TASKS', 'COMPLETED', 'STOPPED', 'PAUSED'], 
    default: 'AWAITING_CRON' 
  }
}, { timestamps: true });

campaignEnrollmentSchema.index({ nextSmsTime: 1, status: 1 });

export const CampaignEnrollment = mongoose.model('CampaignEnrollment', campaignEnrollmentSchema);



