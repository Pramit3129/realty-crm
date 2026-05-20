import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const createCampaignSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    status: z.string().optional().default("DRAFT"),
    workspaceId: objectIdSchema,
});

export const updateCampaignSchema = z.object({
    campaignId: objectIdSchema,
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
});

export const createCampaignStepSchema = z.object({
    campaignId: objectIdSchema,
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Body is required"),
    design: z.any().optional(),
    delayDays: z.number().int().min(0),
    stepOrder: z.number().int().min(0),
});

export const updateCampaignStepSchema = z.object({
    subject: z.string().optional(),
    body: z.string().optional(),
    design: z.any().optional(),
    delayDays: z.number().int().min(0).optional(),
    stepOrder: z.number().int().min(0).optional(),
});

export const startCampaignSchema = z.object({
    campaignId: objectIdSchema,
    leads: z.array(z.object({
        leadId: objectIdSchema,
        email: z.string().email(),
        name: z.string(),
    })).min(1),
});

export const campaignIdParamSchema = z.object({
    campaignId: objectIdSchema,
});

export const workspaceIdParamSchema = z.object({
    workspaceId: objectIdSchema,
});

export const stepIdParamSchema = z.object({
    stepId: objectIdSchema,
});

export const campaignAndStepParamSchema = z.object({
    campaignId: objectIdSchema,
    stepId: objectIdSchema,
});

export const trackParamSchema = z.object({
    batchId: z.string(),
    leadId: objectIdSchema,
});

export const unsubscribeParamSchema = z.object({
    leadId: objectIdSchema,
});

export const createTemplateSchema = z.object({
    name: z.string().min(1),
    html: z.string().min(1),
    design: z.any().optional(),
});

export const templateIdParamSchema = z.object({
    templateId: objectIdSchema,
});
