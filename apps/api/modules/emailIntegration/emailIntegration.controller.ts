import type { Request, Response } from "express";
import { emailIntegrationService } from "./emailIntegration.service";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { EmailIntegration } from "./emailIntegration.model";
import { Lead } from "../lead/lead.model";

export async function getGoogleAuthUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const url = emailIntegrationService.getAuthUrl(userId);
        res.status(200).json({ url });
    } catch (error: any) {
        console.error("Error generating Google Auth URL:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}


export async function getIntegrationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const integration = await EmailIntegration.findOne({ userId });

        if (!integration) {
            res.status(200).json({ isConnected: false });
            return;
        }

        res.status(200).json({ isConnected: true, email: integration.email });
    } catch (error: any) {
        console.error("Error fetching integration status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function sendEmailToLead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { leadId, subject, body } = req.body;
        if (!leadId || !subject || !body) {
            res.status(400).json({ message: "Missing required fields: leadId, subject, body" });
            return;
        }
        const lead = await Lead.findById(leadId);

        if (!lead) {
            res.status(404).json({ message: "Lead not found" });
            return;
        }

        if (!lead.email) {
            res.status(400).json({ message: "Lead does not have an email address" });
            return;
        }
        await emailIntegrationService.sendEmail(userId, lead.email, subject, body);

        res.status(200).json({ message: "Email sent successfully" });
    } catch (error: any) {
        console.error("Error sending email via Gmail API:", error);
        const message = error.message || "Failed to send email";
        res.status(500).json({ message });
    }
}
