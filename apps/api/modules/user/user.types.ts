import { Document, Types } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: "user" | "admin";
    tokenVersion: number;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    licenseNumber?: string;
    phoneNumber?: string;
    address?: string;
    professionalEmail?: string;
    yearsInBusiness?: number;
    calendlyLink?: string;
    markets?: string[];
    signatureImageUrl?: string;
    brandLogoUrl?: string;
    brokerageLogoUrl?: string;
    brokerageName?: string;
    subscriptionId?: Types.ObjectId;
    stripeCustomerId?: string;
    isSubscribed?: boolean;
    onboardingComplete?: boolean;
    avatarUrl?: string;
    website?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserResponse {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    licenseNumber?: string;
    phoneNumber?: string;
    address?: string;
    professionalEmail?: string;
    yearsInBusiness?: number;
    calendlyLink?: string;
    markets?: string[];
    signatureImageUrl?: string;
    brandLogoUrl?: string;
    brokerageLogoUrl?: string;
    brokerageName?: string;
    subscriptionId?: Types.ObjectId;
    isSubscribed?: boolean;
    website?: string;
}
