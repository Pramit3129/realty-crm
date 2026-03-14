import { google } from "googleapis";
import { EmailIntegration, type IEmailIntegration } from "./emailIntegration.model";
import { emailIntegrationService } from "./emailIntegration.service";
import { env } from "../../shared/config/env.config";
import { logger } from "../../shared/config/logger";

class GmailWatchService {
    // Renews the Gmail push notification watch for a single integration
    async renewWatch(integration: IEmailIntegration): Promise<void> {
        try {
            const auth = await emailIntegrationService.getClientForUser(integration.userId, integration);
            const gmail = google.gmail({ version: "v1", auth });

            const projectId = env.GCP_PROJECT_ID;
            const topicName = env.GMAIL_PUBSUB_TOPIC;

            if (!projectId) {
                logger.error("GCP_PROJECT_ID not configured, cannot renew watch", {
                    email: integration.email,
                });
                return;
            }

            const response = await gmail.users.watch({
                userId: "me",
                requestBody: {
                    topicName: `projects/${projectId}/topics/${topicName}`,
                    labelIds: ["INBOX"],
                },
            });

            const expiration = response.data.expiration
                ? new Date(Number(response.data.expiration))
                : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

            const historyId = response.data.historyId;

            const updatePayload: Record<string, unknown> = { watchExpiration: expiration };
            if (historyId) {
                updatePayload.lastHistoryId = historyId;
            }

            await EmailIntegration.updateOne(
                { _id: integration._id },
                updatePayload,
            );

            logger.info("Watch renewed", {
                email: integration.email,
                expiration: expiration.toISOString(),
                historyId,
            });
        } catch (error: any) {
            logger.error("Failed to renew watch", {
                email: integration.email,
                error: error.message,
            });
            throw error;
        }
    }

    // Renews watches for all integrations expiring within 48 hours
    async renewAllExpiring(): Promise<{ renewed: number; failed: number; total: number }> {
        const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now

        // Find integrations with no watch or expiring soon
        const integrations = await EmailIntegration.find({
            $or: [
                { watchExpiration: { $exists: false } },
                { watchExpiration: null },
                { watchExpiration: { $lte: cutoff } },
            ],
        });

        logger.info("Watch renewal: starting batch", { total: integrations.length });

        let renewed = 0;
        let failed = 0;

        for (const integration of integrations) {
            try {
                await this.renewWatch(integration);
                renewed++;
            } catch {
                failed++;
            }
        }

        return { renewed, failed, total: integrations.length };
    }
}

export const gmailWatchService = new GmailWatchService();
