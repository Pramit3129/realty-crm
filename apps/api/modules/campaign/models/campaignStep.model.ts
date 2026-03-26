import mongoose from "mongoose";

const campaignStepSchema = new mongoose.Schema({

  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaing",
    required: true
  },

  subject: {
    type: String,
    required: true
  },

  body: {
    type: String,
    required: true
  },

  design: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },

  delayDays: {
    type: Number,
    default: 0
  },

  stepOrder: {
    type: Number,
    required: true
  }

}, { timestamps: true });

campaignStepSchema.index({ campaignId: 1, stepOrder: 1 }, { unique: true });

export const CampaignStep = mongoose.model("CampaignStep", campaignStepSchema);

/*

stepOrder 1
subject: Welcome
delayDays: 0

stepOrder 2
subject: Property recommendations
delayDays: 5

stepOrder 3
subject: Book a viewing
delayDays: 10

*/