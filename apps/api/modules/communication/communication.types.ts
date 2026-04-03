import type { Types } from "mongoose";

export interface ICommunication {
  leadId: Types.ObjectId;
  realtorId: Types.ObjectId;
  type: "EMAIL" | "SMS" | "CALL";
  subject?: string;
  body: string;
  sentAt: Date;
  senderEmail?: string;
  _id?: Types.ObjectId;
}

export interface ICommunicationCreate {
  leadId: string | Types.ObjectId;
  realtorId: string | Types.ObjectId;
  type: "EMAIL" | "SMS" | "CALL";
  subject?: string;
  body: string;
  senderEmail?: string;
}
