import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { LeadService } from "./lead.service";


// POST /create
export async function createLead(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const { name, email, phone, source, city, workspaceId, pipelineId, stageId, type } = authReq.body;
        const realtorId = authReq.user.id;
        const lead = await LeadService.createLead({ name, email, phone, source, city, realtorId, workspaceId, pipelineId, stageId, type });
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
        const leads = await LeadService.getLeads(workspaceId, authReq.user.id);
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
        const { name, email, phone, source, city, pipelineId, stageId, status } = req.body;
        const lead = await LeadService.updateLead(realtorId, leadId, { name, email, phone, source, city, pipelineId, stageId, status });
        if (!lead) {
            res.status(404).json({ message: "Lead not found" });
            return;
        }
        res.status(200).json({ lead });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to update lead" });
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
        const insertedLeads = await LeadService.addLeads(leads, authReq.user.id, workspaceId, pipelineId, campaignId);
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
        if (!leads || !Array.isArray(leads) || !leads.length || !campaignId || !workspaceId) {
            res.status(400).json({ message: "leads (array), campaignId, and workspaceId are required" });
            return;
        }
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
        const campaignId = req.params.campaignId as string;
        const workspaceId = req.params.workspaceId as string;
        if (!campaignId || !workspaceId) {
            res.status(400).json({ message: "campaignId and workspaceId are required" });
            return;
        }
        const leads = await LeadService.getLeadsByCampaing(campaignId, userId, workspaceId);
        res.status(200).json({ leads });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to fetch leads" });
    }
}