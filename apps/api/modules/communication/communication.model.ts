import mongoose from "mongoose";
import type { ICommunication } from "./communication.types";

const communicationSchema = new mongoose.Schema<ICommunication>(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    realtorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["EMAIL", "SMS", "CALL"],
      required: true,
      default: "EMAIL",
    },
    subject: {
      type: String,
    },
    body: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    senderEmail: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

communicationSchema.index({ leadId: 1 });
communicationSchema.index({ realtorId: 1 });

export const Communication = mongoose.model<ICommunication>(
  "Communication",
  communicationSchema,
);
