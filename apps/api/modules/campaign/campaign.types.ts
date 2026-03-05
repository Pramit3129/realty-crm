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
    delayDays: number;
    stepOrder: number;
}