import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { LeadService } from "./lead.service";


// POST /create
export async function createLead(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const { ...leadData } = authReq.body;
        const realtorId = authReq.user.id;
        const hasSMSCampaignEnabled = authReq.user.hasSMSCampaignEnabled ?? false;
        const lead = await LeadService.createLead({ ...leadData, realtorId }, hasSMSCampaignEnabled);
        res.status(201).json({ lead });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to create lead" });
    }
}

// GET /workspace/:workspaceId
export async function getLeads(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const workspaceId = req.params.workspaceId as string;
        const tagId = req.query.tagId as string | undefined;
        const leads = await LeadService.getLeads(workspaceId, authReq.user.id, tagId);
        res.status(200).json({ leads });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch leads" });
    }
}

// GET /details/:id
export async function getLeadDetails(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const leadId = req.params.id as string;
        const realtorId = authReq.user.id;
        const lead = await LeadService.getLeadDetails(realtorId, leadId);
        if (!lead) {
            res.status(404).json({ message: "Lead not found" });
            return;
        }
        res.status(200).json({ lead });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch lead details" });
    }
}

// GET /details/:id/emails
export async function getLeadEmails(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const leadId = req.params.id as string;
        const realtorId = authReq.user.id;
        const emails = await LeadService.getLeadEmails(realtorId, leadId);
        res.status(200).json({ emails });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch lead emails" });
    }
}

// GET /emails
export async function getAllEmails(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const realtorId = authReq.user.id;
        const emails = await LeadService.getAllEmails(realtorId);
        res.status(200).json({ emails });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to fetch all emails" });
    }
}

// PUT /details/:id
export async function updateLead(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const leadId = req.params.id as string;
        const realtorId = authReq.user.id;
        const { name, email, phone, source, city, pipelineId, stageId, status, extra_fields } = req.body;
        const lead = await LeadService.updateLead(realtorId, leadId, { name, email, phone, source, city, pipelineId, stageId, status, extra_fields });
        if (!lead) {
            res.status(404).json({ message: "Lead not found" });
            return;
        }
        res.status(200).json({ lead });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to update lead" });
    }
}

// PUT /details/:id/owner
export async function reassignLeadOwner(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const leadId = req.params.id as string;
        const callerId = authReq.user.id;
        const { newOwnerId } = req.body as { newOwnerId: string };
        const lead = await LeadService.reassignOwner(callerId, leadId, newOwnerId);
        if (!lead) {
            res.status(404).json({ message: "Lead not found" });
            return;
        }
        res.status(200).json({ lead });
    } catch (error: any) {
        const msg = error.message || "Failed to reassign lead";
        const status = msg.includes("Only workspace owners") ? 403
            : msg.includes("not a member") ? 400
            : msg.includes("not found") ? 404
            : 400;
        res.status(status).json({ message: msg });
    }
}

// DELETE /details/:id
export async function deleteLead(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const leadId = req.params.id as string;
        const realtorId = authReq.user.id;
        const lead = await LeadService.deleteLead(realtorId, leadId);
        if (!lead) {
            res.status(404).json({ message: "Lead not found" });
            return;
        }
        res.status(200).json({ lead });
    } catch (error: any) {
        res.status(500).json({ message: error.message || "Failed to delete lead" });
    }
}

// POST /addLeads
export async function addLeads(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const { leads, workspaceId, pipelineId, campaignId } = req.body;
        const hasSMSCampaignEnabled = authReq.user.hasSMSCampaignEnabled ?? false;
        const insertedLeads = await LeadService.addLeads(leads, authReq.user.id, workspaceId, pipelineId, campaignId, hasSMSCampaignEnabled);
        res.status(201).json({ leads: insertedLeads });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to add leads" });
    }
}

export async function assignCampaingToLeads(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const { leads, workspaceId, campaignId } = req.body;
        const updatedLeads = await LeadService.assignCampaingToLeads(leads, campaignId, userId, workspaceId);
        res.status(200).json({ leads: updatedLeads });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to assign campaign to leads" });
    }
}

export async function getLeadsByCampaing(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const { campaignId, workspaceId } = req.params;
        const leads = await LeadService.getLeadsByCampaing(campaignId as string, userId, workspaceId as string);
        res.status(200).json({ leads });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to fetch leads" });
    }
}

export async function assignTagsToLeads(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const { leadIds, tagId } = req.body;
        const workspaceId = req.headers["x-workspace-id"] as string;
        
        if (!workspaceId) {
            return res.status(400).json({ error: "Workspace ID is required in headers" });
        }

        const updatedLeads = await LeadService.assignTagsToLeads(leadIds, tagId, userId, workspaceId);
        res.status(200).json({ success: true, modifiedCount: updatedLeads.modifiedCount });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to assign tags to leads" });
    }
}

export async function removeTagsFromLeads(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const { leadIds, tagId } = req.body;
        const workspaceId = req.headers["x-workspace-id"] as string;

        if (!workspaceId) {
            return res.status(400).json({ error: "Workspace ID is required in headers" });
        }

        const updatedLeads = await LeadService.removeTagsFromLeads(leadIds, tagId, userId, workspaceId);
        res.status(200).json({ success: true, modifiedCount: updatedLeads.modifiedCount });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to remove tags from leads" });
    }
}