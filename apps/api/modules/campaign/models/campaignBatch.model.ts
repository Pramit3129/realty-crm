import mongoose from "mongoose";

// this store which leads will receive which step.

const campaignBatchSchema = new mongoose.Schema({

    campaignId: mongoose.Schema.Types.ObjectId,

    stepId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CampaignStep"
    },

    leads: [{
        leadId: { type: mongoose.Schema.Types.ObjectId, required: true },
        email: { type: String, required: true },
        name: { type: String, required: true }
    }],

    runAt: Date,

    status: {
        type: String,
        enum: ["pending", "queued", "processing", "sent", "failed"],
        default: "pending"
    }

});

campaignBatchSchema.index({
    status: 1,
    runAt: 1
});

/*

stepId → tells worker which email to send
runAt → when to send it

*/

export const CampaignBatch = mongoose.model("CampaignBatch", campaignBatchSchema);