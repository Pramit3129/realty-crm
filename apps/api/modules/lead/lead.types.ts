import type { Types } from "mongoose";

export interface ILead {
    name: string;
    email: string;
    phone: string;
    source: string;
    city?: string;
    status: string;
    realtorId: Types.ObjectId;
    workspaceId: Types.ObjectId;
    pipelineId: Types.ObjectId;
    stageId?: Types.ObjectId;
    campaignId?: Types.ObjectId;
    isUnsubscribed?: boolean;
    unsubscribedAt?: Date;
}

export interface ILeadCreate {
    name: string;
    email: string;
    phone: string;
    source: string;
    city?: string;
    realtorId: Types.ObjectId | string;
    workspaceId: Types.ObjectId | string;
    pipelineId?: Types.ObjectId | string;
    stageId?: Types.ObjectId | string;
    campaignId?: Types.ObjectId | string;
    type?: "BUYER" | "SELLER";
    status?: string;
}

export interface IleadOverView {
    name: string,
    email: string,
    phone: string,
    _id: Types.ObjectId,
}

export interface ILeadUpdate {
    name?: string;
    email?: string;
    phone?: string;
    source?: string;
    city?: string;
    realtorId?: Types.ObjectId | string;
    pipelineId?: Types.ObjectId | string;
    stageId?: Types.ObjectId | string;
    status?: string;
}