import type mongoose from "mongoose";

export interface IMail {
    subject: string;
    body: string;
}

export interface ILeadsMail {
    leadId: mongoose.Types.ObjectId;
    leadName: string;
    mailId: string;
}