import type { Types } from "mongoose";

export interface ILead {
    name: string;
    email: string;
    phone: string;
    source: string;
    status: string;
    realtorId: Types.ObjectId;
    workspaceId: Types.ObjectId;
}

export interface ILeadCreate {
    name: string;
    email: string;
    phone: string;
    source: string;
    realtorId: Types.ObjectId | string;
    workspaceId: Types.ObjectId | string;
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
    realtorId?: Types.ObjectId | string;
}