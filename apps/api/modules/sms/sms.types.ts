import mongoose from "mongoose"


export interface ISmsCampaign {
    userId: mongoose.Types.ObjectId,
    name: string,
    steps: [{
        stepIndex: number,
        delaySeconds: number,
        message: string
    }],
    isActive: boolean,
    isDefault: boolean,
}

export interface ICampaignEnrollment {
    leadId: mongoose.Types.ObjectId,
    campaignId: mongoose.Types.ObjectId,
    currentStepIndex: number,
    nextSmsTime: Date,
    status: string,
}

export interface Istep{
    stepIndex: number,
    delaySeconds: number,
    message: string
}