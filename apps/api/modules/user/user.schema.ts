import { z } from "zod";

export const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    website: z.string().url().optional().or(z.literal("")),
    avatarUrl: z.string().url().optional().or(z.literal("")),
    businessName: z.string().optional(),
    licenseNumber: z.string().optional(),
    professionalEmail: z.string().email().optional().or(z.literal("")),
    yearsInBusiness: z.number().optional(),
    calendlyLink: z.string().url().optional().or(z.literal("")),
    markets: z.array(z.string()).optional(),
    signatureImageUrl: z.string().url().optional().or(z.literal("")),
    brandLogoUrl: z.string().url().optional().or(z.literal("")),
    brokerageLogoUrl: z.string().url().optional().or(z.literal("")),
    brokerageName: z.string().optional(),
    hasSMSCampaignEnabled: z.boolean().optional(),
});
