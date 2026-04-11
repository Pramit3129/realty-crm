import { Schema, model, Types } from "mongoose";
import type { IUser } from "./user.types";

const userSchema = new Schema<IUser>(
     {
          name: {
               type: String,
               required: true,
               trim: true,
          },
          email: {
               type: String,
               required: true,
               unique: true,
               lowercase: true,
               trim: true,
          },
          password: {
               type: String,
               required: true,
          },
          role: {
               type: String,
               enum: ["user", "admin"],
               default: "user",
          },
          tokenVersion: {
               type: Number,
               default: 0,
          },
          firstName: String,
          lastName: String,
          businessName: String,
          licenseNumber: String,
          phoneNumber: String,
          address: String,
          professionalEmail: String,
          yearsInBusiness: Number,
          calendlyLink: String,
          markets: [String],
          signatureImageUrl: String,
          brandLogoUrl: String,
          brokerageLogoUrl: String,
          brokerageName: String,
          subscriptionId: {
               type: Types.ObjectId,
               ref: "Subscription",
          },
          isSubscribed: {
               type: Boolean,
               default: false,
          },
          stripeCustomerId: {
               type: String,
          },
          avatarUrl: String,
          website: String,
          onboardingComplete: {
               type: Boolean,
               default: false,
          },
          hasSMSCampaignEnabled: {
               type: Boolean,
               default: false,
          },
     },
     { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
