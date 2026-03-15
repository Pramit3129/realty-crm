import { Schema, model } from "mongoose";
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
        subscriptionPlan: {
            type: String,
            enum: ['free', 'pro', 'enterprise'],
            default: 'free',
        },
        avatarUrl: String,
        onboardingComplete: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
