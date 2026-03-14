import type { Request, Response } from "express";
import { emailIntegrationService } from "./emailIntegration.service";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { EmailIntegration } from "./emailIntegration.model";
import { Lead } from "../lead/lead.model";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../shared/config/env.config";
import { CommunicationService } from "../communication/communication.service";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "../activity/activity.types";
import { enqueueTask } from "../../shared/config/cloudTasks.client";
import { logger } from "../../shared/config/logger";

const authClient = new OAuth2Client();


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
        logger.error("Error generating Google Auth URL", { error: error.message });
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

        const integration = await EmailIntegration.findOne({ userId }).select("email");

        if (!integration) {
            res.status(200).json({ isConnected: false });
            return;
        }

        res.status(200).json({ isConnected: true, email: integration.email });
    } catch (error: any) {
        logger.error("Error fetching integration status", { error: error.message });
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

        // Security: scope lead lookup to the authenticated user
        const lead = await Lead.findOne({ _id: leadId, realtorId: userId }).select("email name");

        if (!lead) {
            res.status(404).json({ message: "Lead not found" });
            return;
        }

        if (!lead.email) {
            res.status(400).json({ message: "Lead does not have an email address" });
            return;
        }

        await emailIntegrationService.sendEmail(userId, lead.email, subject, body);

        // Save communication record
        await CommunicationService.createCommunication({
            leadId,
            realtorId: userId,
            type: "EMAIL",
            subject,
            body
        });

        // Log activity
        await ActivityService.logActivity({
            leadId,
            realtorId: userId,
            type: ActivityType.EMAIL_SENT,
            content: `Sent email: ${subject}`
        });

        logger.info("Email sent to lead", { userId, leadId, to: lead.email });
        res.status(200).json({ message: "Email sent successfully" });
    } catch (error: any) {
        logger.error("Error sending email via Gmail API", { error: error.message });
        const message = error.message || "Failed to send email";
        res.status(500).json({ message });
    }
}


// Webhook receiver for Gmail Push Notifications
export async function receiveWebhook(req: Request, res: Response): Promise<void> {
    try {
        // 1. Verify Pub/Sub JWT bearer token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Missing or invalid Authorization header" });
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Token missing from Authorization header" });
            return;
        }

        try {
            const audienceStr: string = env.BACKEND_URL
                ? `${env.BACKEND_URL}/api/v1/emailIntegration/webhook/receive`
                : "http://localhost:3000/api/v1/emailIntegration/webhook/receive";

            const ticket = await authClient.verifyIdToken({
                idToken: token,
                audience: audienceStr,
            });
            const payload = ticket.getPayload();

            if (!payload || !payload.email_verified) {
                logger.warn("Webhook token payload invalid", { email_verified: payload?.email_verified });
                res.status(403).json({ message: "Invalid token payload" });
                return;
            }

            // Verify issuer
            if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
                logger.warn("Webhook token issuer invalid", { issuer: payload.iss });
                res.status(403).json({ message: "Forbidden: Invalid token issuer" });
                return;
            }
        } catch (authError: any) {
            logger.error("Webhook authentication failed", { error: authError.message });
            res.status(403).json({ message: "Forbidden: Invalid token" });
            return;
        }

        // 2. Validate and decode Pub/Sub message
        const message = req.body?.message;
        if (!message || !message.data) {
            res.status(400).json({ message: "Bad Request: Invalid Pub/Sub message format" });
            return;
        }

        const dataStr = Buffer.from(message.data, "base64").toString("utf8");

        let data: { emailAddress?: string; historyId?: string | number };
        try {
            data = JSON.parse(dataStr);
        } catch {
            logger.error("Webhook received malformed JSON in Pub/Sub data", { raw: dataStr });
            res.status(400).json({ message: "Bad Request: Malformed message data" });
            return;
        }

        const { emailAddress, historyId } = data;

        if (!emailAddress || !historyId) {
            logger.warn("Webhook received message with missing fields", { emailAddress, historyId });
            // Still return 200 to avoid Pub/Sub retrying a permanently bad message
            res.status(200).send("OK");
            return;
        }

        // 3. Enqueue processing job to Cloud Tasks (non-blocking)
        await enqueueTask("/api/v1/emailIntegration/webhook/worker", {
            emailAddress,
            historyId: historyId.toString(),
        });

        logger.info("Webhook enqueued Cloud Tasks processing job", { emailAddress, historyId });

        // 4. Return 200 immediately
        res.status(200).send("OK");
    } catch (error: any) {
        logger.error("Error in webhook receiver", { error: error.message, stack: error.stack });
        // Return 200 to prevent Pub/Sub from retrying on application errors
        // that won't resolve on retry (e.g. publish failures are transient
        // and Pub/Sub will redeliver the original message)
        res.status(500).json({ message: "Internal server error" });
    }
}


// Worker endpoint: receives jobs from Google Cloud Tasks
export async function processWebhookWorker(req: Request, res: Response): Promise<void> {
    try {
        // Verify internal secret or Cloud Tasks OIDC JWT
        const internalSecret = req.headers["x-internal-secret"];
        if (internalSecret !== env.INTERNAL_SECRET) {
            // Try OIDC JWT verification as fallback
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const token = authHeader.split(" ")[1];
            if (!token) {
                res.status(401).json({ message: "Token missing" });
                return;
            }

            try {
                const audienceStr: string = env.BACKEND_URL
                    ? `${env.BACKEND_URL}/api/v1/emailIntegration/webhook/worker`
                    : "http://localhost:3000/api/v1/emailIntegration/webhook/worker";

                const ticket: any = await authClient.verifyIdToken({
                    idToken: token as string,
                    audience: audienceStr,
                });
                const payload = ticket.getPayload();
                if (!payload || !payload.email_verified) {
                    res.status(403).json({ message: "Forbidden" });
                    return;
                }
            } catch {
                res.status(403).json({ message: "Forbidden: Invalid token" });
                return;
            }
        }

        // Cloud Tasks sends the direct JSON payload as configured in enqueueTask
        const { emailAddress, historyId } = req.body || {};

        if (!emailAddress || !historyId) {
            logger.warn("Worker received task with missing fields", { emailAddress, historyId });
            res.status(200).send("OK");
            return;
        }

        // Import worker service lazily to avoid circular dependencies
        const { gmailWorkerService } = await import("./gmailWorker.service");
        await gmailWorkerService.processHistoryEvent(emailAddress, historyId);

        logger.info("Worker processed history event", { emailAddress, historyId });
        res.status(200).send("OK");
    } catch (error: any) {
        logger.error("Worker processing failed", {
            error: error.message,
            stack: error.stack,
        });
        // Return 500 to let Pub/Sub retry on transient failures
        res.status(500).json({ message: "Processing failed" });
    }
}


// Endpoint for Cloud Scheduler to trigger Gmail watch renewal
export async function renewWatches(req: Request, res: Response): Promise<void> {
    try {
        const internalSecret = req.headers["x-internal-secret"];
        if (internalSecret !== env.INTERNAL_SECRET) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { gmailWatchService } = await import("./gmailWatch.service");
        const result = await gmailWatchService.renewAllExpiring();

        logger.info("Watch renewal completed", { renewed: result.renewed, failed: result.failed });
        res.status(200).json({ message: "Watch renewal completed", ...result });
    } catch (error: any) {
        logger.error("Watch renewal failed", { error: error.message });
        res.status(500).json({ message: "Watch renewal failed" });
    }
}