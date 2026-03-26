import type mongoose from "mongoose";

export interface ICampaign {
    name: string;
    description: string;
    status: string;
    workspaceId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICampaignCreate {
    name: string;
    description: string;
    status: string;
    workspaceId: string;
    userId: string;
}


export interface ICampaignUpdate {
    campaignId: string;
    name?: string;
    description?: string;
    status?: string;
}

export interface ICampaignResponse {
    _id: string;
    name: string;
    description: string;
    status: string;
    workspaceId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICampaignStepCreate {
    campaignId: string;
    subject: string;
    body: string;
    design?: any;
    delayDays: number;
    stepOrder: number;
}

export interface ICampaignStart {
    campaignId: string;
    leads: ILead[];
}

export interface ILead {
    leadId: mongoose.Schema.Types.ObjectId;
    email: string;
    name: string;
}