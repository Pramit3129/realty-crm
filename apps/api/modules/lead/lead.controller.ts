import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { LeadService } from "./lead.service";


// POST /create
export async function createLead(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const { name, email, phone, source, workspaceId } = req.body;
        const realtorId = authReq.user.id;
        const lead = await LeadService.createLead({ name, email, phone, source, realtorId, workspaceId });
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

// PUT /details/:id
export async function updateLead(req: Request, res: Response) {
    try {
        const authReq = req as AuthenticatedRequest;
        const leadId = req.params.id as string;
        const realtorId = authReq.user.id;
        const { name, email, phone, source } = req.body;
        const lead = await LeadService.updateLead(realtorId, leadId, { name, email, phone, source });
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
        const { leads, workspaceId } = req.body;
        const insertedLeads = await LeadService.addLeads(leads, authReq.user.id, workspaceId);
        res.status(201).json({ leads: insertedLeads });
    } catch (error: any) {
        res.status(400).json({ message: error.message || "Failed to add leads" });
    }
}
