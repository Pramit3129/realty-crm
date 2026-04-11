import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

// ── Step sub-schema ───────────────────────────────────────────────────
const stepSchema = z.object({
    stepIndex: z.number().int().min(0, "stepIndex must be >= 0"),
    delaySeconds: z.number().int().min(0, "delaySeconds must be >= 0"),
    message: z.string().min(1, "message is required"),
});

// ── Create Campaign ───────────────────────────────────────────────────
export const createSmsCampaignSchema = z.object({
    name: z.string().min(1, "Campaign name is required"),
    steps: z.array(stepSchema).min(1, "At least one step is required"),
    isActive: z.boolean().optional().default(true),
    isDefault: z.boolean().optional().default(false),
});

// ── Update Campaign ───────────────────────────────────────────────────
export const updateSmsCampaignSchema = z.object({
    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
});

// ── Add Step ──────────────────────────────────────────────────────────
export const addStepSchema = z.object({
    stepIndex: z.number().int().min(0),
    delaySeconds: z.number().int().min(0),
    message: z.string().min(1, "message is required"),
});

// ── Update Step ───────────────────────────────────────────────────────
export const updateStepSchema = z.object({
    delaySeconds: z.number().int().min(0).optional(),
    message: z.string().min(1).optional(),
});

// ── Param Schemas ─────────────────────────────────────────────────────
export const campaignIdParamSchema = z.object({
    campaignId: objectIdSchema,
});

export const stepIndexParamSchema = z.object({
    campaignId: objectIdSchema,
    stepIndex: z.string().regex(/^\d+$/, "stepIndex must be a non-negative integer"),
});
