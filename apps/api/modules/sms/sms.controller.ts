import { SMS_Service } from "./services/sms.service";
import type { Request, Response } from "express";
import { env } from "../../shared/config/env.config";
import { Lead } from "../lead/lead.model";
import type { AuthenticatedRequest, AuthenticatedUser } from "../../shared/middleware/requireAuth";


export async function onboardUser(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user as AuthenticatedUser;
    const { country, areaCode } = req.body;
    if (!country || !areaCode) {
        return res.status(400).json({
            success: false,
            message: "Country and area code are required",
        });
    }
    await SMS_Service.onboardUser(user, country, areaCode);
    res.status(200).send("User onboarded successfully");
}

export async function assignCampaing(req: Request, res: Response){
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user as AuthenticatedUser;

    const lead = await Lead.findOne({_id: req.body.leadId, userId: user._id}).select("_id");
    if(!lead){
        return res.status(404).json({message: "Lead not found or not assigned to you"});
    }
    const {campaignId} = req.body;  
    
    if(!campaignId){
        return res.status(400).json({message: "Campaign ID is required"});
    }

    const assignedStatus = await SMS_Service.assignCampaign(lead._id.toString(), 0, campaignId);
    
    res.status(200).send({message: "Campaign assigned successfully", assignedStatus});
}

export async function assignCampaings(req: Request, res: Response){
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user as AuthenticatedUser;

    const { leadIds, campaignId } = req.body;

    if(!Array.isArray(leadIds) || leadIds.length === 0){
        return res.status(400).json({message: "leadIds must be a non-empty array"});
    }

    if(!campaignId){
        return res.status(400).json({message: "Campaign ID is required"});
    }

    // Verify all leads belong to the user
    const validLeads = await Lead.find({_id: {$in: leadIds}, userId: user._id}).select("_id");
    const validLeadIds = validLeads.map(l => l._id.toString());

    const invalidLeadIds = leadIds.filter((id: string) => !validLeadIds.includes(id));
    if(invalidLeadIds.length > 0){
        return res.status(404).json({
            message: "Some leads were not found or not assigned to you",
            invalidLeadIds,
        });
    }

    const result = await SMS_Service.assignCampaigns(validLeadIds, 0, campaignId);

    res.status(200).send(result);
}

// ── SMS Campaign CRUD ─────────────────────────────────────────────────

export async function createSmsCampaign(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;
        const { name, steps, isActive, isDefault } = req.body;

        const campaign = await SMS_Service.createCampaign(userId, {
            name,
            steps,
            isActive,
            isDefault,
        });

        return res.status(201).json({
            success: true,
            message: "SMS campaign created successfully",
            data: campaign,
        });
    } catch (error: any) {
        console.error("[SMS Controller] createSmsCampaign error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create SMS campaign",
        });
    }
}

export async function getSmsCampaigns(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;

        const campaigns = await SMS_Service.getCampaigns(userId);

        return res.status(200).json({
            success: true,
            message: "SMS campaigns fetched successfully",
            data: campaigns,
        });
    } catch (error: any) {
        console.error("[SMS Controller] getSmsCampaigns error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch SMS campaigns",
        });
    }
}

export async function getSmsCampaignById(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;
        const campaignId = req.params.campaignId as string;

        const campaign = await SMS_Service.getCampaignById(campaignId, userId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "SMS campaign not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "SMS campaign fetched successfully",
            data: campaign,
        });
    } catch (error: any) {
        console.error("[SMS Controller] getSmsCampaignById error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch SMS campaign",
        });
    }
}

export async function updateSmsCampaign(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;
        const campaignId = req.params.campaignId as string;
        const { name, isActive, isDefault } = req.body;

        const campaign = await SMS_Service.updateCampaign(campaignId, userId, {
            name,
            isActive,
            isDefault,
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "SMS campaign not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "SMS campaign updated successfully",
            data: campaign,
        });
    } catch (error: any) {
        console.error("[SMS Controller] updateSmsCampaign error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update SMS campaign",
        });
    }
}

export async function deleteSmsCampaign(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;
        const campaignId = req.params.campaignId as string;

        const campaign = await SMS_Service.deleteCampaign(campaignId, userId);
        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "SMS campaign not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "SMS campaign deleted successfully",
            data: campaign,
        });
    } catch (error: any) {
        console.error("[SMS Controller] deleteSmsCampaign error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete SMS campaign",
        });
    }
}

// ── Step Management ───────────────────────────────────────────────────

export async function addStep(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;
        const campaignId = req.params.campaignId as string;
        const { stepIndex, delaySeconds, message } = req.body;

        const campaign = await SMS_Service.addStep(campaignId, userId, {
            stepIndex,
            delaySeconds,
            message,
        });

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "SMS campaign not found",
            });
        }

        return res.status(201).json({
            success: true,
            message: "Step added successfully",
            data: campaign,
        });
    } catch (error: any) {
        console.error("[SMS Controller] addStep error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to add step",
        });
    }
}

export async function updateStep(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;
        const campaignId = req.params.campaignId as string;
        const stepIndex = req.params.stepIndex as string;
        const { delaySeconds, message } = req.body;

        const campaign = await SMS_Service.updateStep(
            campaignId,
            userId,
            parseInt(stepIndex, 10),
            { delaySeconds, message }
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "SMS campaign or step not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Step updated successfully",
            data: campaign,
        });
    } catch (error: any) {
        console.error("[SMS Controller] updateStep error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update step",
        });
    }
}

export async function deleteStep(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user._id;
        const campaignId = req.params.campaignId as string;
        const stepIndex = req.params.stepIndex as string;

        const campaign = await SMS_Service.deleteStep(
            campaignId,
            userId,
            parseInt(stepIndex, 10)
        );

        if (!campaign) {
            return res.status(404).json({
                success: false,
                message: "SMS campaign or step not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Step deleted successfully",
            data: campaign,
        });
    } catch (error: any) {
        console.error("[SMS Controller] deleteStep error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete step",
        });
    }
}

// ── Worker Endpoint ───────────────────────────────────────────────────

export async function smsWorker(req: Request, res: Response) {
    try {
        const internalSecret = req.headers["x-internal-secret"];
        if (internalSecret !== env.INTERNAL_SECRET) {
            return res.status(401).json({ message: "Unauthorized: Invalid internal secret" });
        }

        const { enrollmentId, campaignIdAtTimeOfScheduling, stepIndexAtTimeOfScheduling } = req.body;

        if (!enrollmentId || !campaignIdAtTimeOfScheduling || stepIndexAtTimeOfScheduling === undefined) {
            return res.status(400).send("Missing required parameters");
        }

        const result = await SMS_Service.processWorkerTask(
            enrollmentId,
            campaignIdAtTimeOfScheduling,
            stepIndexAtTimeOfScheduling
        );

        return res.status(200).send(result.message);
    } catch (error: any) {
        console.error("[SMS Controller] smsWorker error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process SMS worker task",
        });
    }
}