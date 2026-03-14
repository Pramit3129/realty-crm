import { google } from "googleapis";
import { EmailIntegration } from "./emailIntegration.model";
import { EmailHistory } from "./emailHistory.model";
import { Lead } from "../lead/lead.model";
import { emailIntegrationService } from "./emailIntegration.service";
import { redisClient } from "../../shared/config/redis.client";
import { logger } from "../../shared/config/logger";
import { extractEmailBody, extractSenderEmail, getHeader } from "./utils/gmailParser.util";
import { env } from "../../shared/config/env.config";

// p-limit is ESM-only; use dynamic import
let pLimitFn: ((concurrency: number) => import("p-limit").LimitFunction) | null = null;

async function getPLimit() {
    if (!pLimitFn) {
        const mod = await import("p-limit");
        pLimitFn = mod.default;
    }
    return pLimitFn;
}

const REDIS_TTL = 3600; // 1 hour
const REDIS_KEY_PREFIX = "email_integration:";

class GmailWorkerService {
    // Processes a single Gmail history event
    async processHistoryEvent(emailAddress: string, historyId: string): Promise<void> {
        const cacheKey = `${REDIS_KEY_PREFIX}${emailAddress}`;

        // 1. Load integration data (Redis → MongoDB fallback)
        const integrationDoc = await this.loadIntegration(emailAddress, cacheKey);
        if (!integrationDoc) {
            logger.warn("Worker: no integration found", { emailAddress });
            return;
        }

        // 2. Build authenticated Gmail client
        const auth = await emailIntegrationService.getClientForUser(integrationDoc.userId, integrationDoc);
        const gmail = google.gmail({ version: "v1", auth });

        const startHistoryId = integrationDoc.lastHistoryId;

        // 3. If this is the first notification, just store the historyId
        if (!startHistoryId) {
            await this.updateLastHistoryId(emailAddress, historyId, cacheKey, integrationDoc);
            logger.info("Worker: initialized historyId for new integration", { emailAddress, historyId });
            return;
        }

        try {
            // 4. Fetch history from Gmail
            const historyResponse = await gmail.users.history.list({
                userId: "me",
                startHistoryId,
                historyTypes: ["messageAdded"],
            });

            const history = historyResponse.data.history || [];

            // 5. Extract all message IDs from history
            const messageIds = this.extractMessageIds(history);

            if (messageIds.length === 0) {
                await this.updateLastHistoryId(emailAddress, historyId, cacheKey, integrationDoc);
                return;
            }

            // 6. Fetch messages with concurrency control
            const parsedMessages = await this.fetchMessagesWithConcurrency(gmail, messageIds);

            // 7. Match to leads and insert email history records
            await this.matchAndInsertEmails(parsedMessages, integrationDoc.userId);

            // 8. Update lastHistoryId
            await this.updateLastHistoryId(emailAddress, historyId, cacheKey, integrationDoc);

            logger.info("Worker: history processed", {
                emailAddress,
                historyId,
                messagesProcessed: parsedMessages.length,
            });
        } catch (error: any) {
            if (error.code === 404 || error.status === 404) {
                // History ID not found — perform recovery sync
                logger.warn("Worker: historyId not found, starting recovery sync", {
                    emailAddress,
                    startHistoryId,
                });
                await this.performRecoverySync(gmail, emailAddress, integrationDoc);
            } else {
                logger.error("Worker: error processing history", {
                    emailAddress,
                    error: error.message,
                    stack: error.stack,
                });
                throw error; // Re-throw to let the controller decide on retry
            }
        }
    }

    // Recovery sync: fetches recent emails when history.list returns 404
    async performRecoverySync(
        gmail: ReturnType<typeof google.gmail>,
        emailAddress: string,
        integrationDoc: any,
    ): Promise<void> {
        const cacheKey = `${REDIS_KEY_PREFIX}${emailAddress}`;

        try {
            logger.info("Worker: performing recovery sync", { emailAddress });

            // Fetch recent messages
            const listResponse = await gmail.users.messages.list({
                userId: "me",
                q: "newer_than:7d",
                maxResults: 500,
            });

            const messages = listResponse.data.messages || [];

            if (messages.length === 0) {
                logger.info("Worker: no recent messages found during recovery sync", { emailAddress });
                return;
            }

            const messageIds = messages
                .map((m) => m.id)
                .filter((id): id is string => !!id);

            // Fetch messages with concurrency control
            const parsedMessages = await this.fetchMessagesWithConcurrency(gmail, messageIds);

            // Match and insert
            await this.matchAndInsertEmails(parsedMessages, integrationDoc.userId);

            // Update historyId to the latest message's historyId
            let latestHistoryId = integrationDoc.lastHistoryId;
            if (parsedMessages.length > 0) {
                // Fetch the profile to get the current historyId
                const profile = await gmail.users.getProfile({ userId: "me" });
                latestHistoryId = profile.data.historyId || latestHistoryId;
            }

            // Update integrations with recovery timestamp
            await EmailIntegration.updateOne(
                { email: emailAddress },
                {
                    lastHistoryId: latestHistoryId,
                    lastFullSyncAt: new Date(),
                },
            );

            integrationDoc.lastHistoryId = latestHistoryId;
            integrationDoc.lastFullSyncAt = new Date();
            await redisClient.set(cacheKey, JSON.stringify(integrationDoc), "EX", REDIS_TTL);

            logger.info("Worker: recovery sync completed", {
                emailAddress,
                messagesProcessed: parsedMessages.length,
                newHistoryId: latestHistoryId,
            });
        } catch (error: any) {
            logger.error("Worker: recovery sync failed", {
                emailAddress,
                error: error.message,
                stack: error.stack,
            });
        }
    }

    // ─── Internal helpers ────────────────────────────────────────────────

    // Load integration from Redis cache or MongoDB
    private async loadIntegration(emailAddress: string, cacheKey: string): Promise<any | null> {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        const dbIntegration = await EmailIntegration.findOne({ email: emailAddress });
        if (!dbIntegration) {
            return null;
        }

        const doc = dbIntegration.toObject();
        await redisClient.set(cacheKey, JSON.stringify(doc), "EX", REDIS_TTL);
        return doc;
    }

    // Extract unique message IDs from Gmail history
    private extractMessageIds(history: any[]): string[] {
        const ids = new Set<string>();

        for (const record of history) {
            if (record.messagesAdded) {
                for (const msgAdded of record.messagesAdded) {
                    const id = msgAdded.message?.id;
                    if (id) ids.add(id);
                }
            }
        }

        return Array.from(ids);
    }

    // Fetch Gmail messages with concurrency control
    private async fetchMessagesWithConcurrency(
        gmail: ReturnType<typeof google.gmail>,
        messageIds: string[],
    ): Promise<ParsedMessage[]> {
        const pLimit = await getPLimit();
        const limit = pLimit(env.GMAIL_CONCURRENCY_LIMIT);

        const results = await Promise.all(
            messageIds.map((messageId) =>
                limit(async (): Promise<ParsedMessage | null> => {
                    try {
                        const messageData = await gmail.users.messages.get({
                            userId: "me",
                            id: messageId,
                            format: "full",
                        });

                        const payload = messageData.data.payload;
                        const headers = payload?.headers;

                        const fromHeader = getHeader(headers, "from");
                        const subject = getHeader(headers, "subject") || "No Subject";
                        const senderEmail = extractSenderEmail(fromHeader);

                        if (!senderEmail) return null;

                        const body = extractEmailBody(payload) || "No Content";

                        return { senderEmail, subject, body, messageId };
                    } catch (error: any) {
                        logger.error("Worker: failed to fetch message", {
                            messageId,
                            error: error.message,
                        });
                        return null;
                    }
                }),
            ),
        );

        return results.filter((r): r is ParsedMessage => r !== null);
    }

    // Batch-match sender emails to leads and insert EmailHistory records
    private async matchAndInsertEmails(
        parsedMessages: ParsedMessage[],
        userId: string,
    ): Promise<void> {
        if (parsedMessages.length === 0) return;

        // Collect unique sender emails
        const uniqueSenderEmails = [...new Set(parsedMessages.map((m) => m.senderEmail))];

        // Single batch query for all matching leads (avoids N+1)
        const leads = await Lead.find({
            email: { $in: uniqueSenderEmails },
            realtorId: userId,
        }).select("_id email");

        // Group leads by email for fast lookup
        const leadsByEmail = new Map<string, typeof leads>();
        for (const lead of leads) {
            const email = lead.email.toLowerCase().trim();
            if (!leadsByEmail.has(email)) {
                leadsByEmail.set(email, []);
            }
            leadsByEmail.get(email)!.push(lead);
        }

        // Build email history records
        const emailRecords: any[] = [];
        for (const msg of parsedMessages) {
            const matchedLeads = leadsByEmail.get(msg.senderEmail) || [];
            for (const lead of matchedLeads) {
                emailRecords.push({
                    leadId: lead._id,
                    realtorId: userId,
                    subject: msg.subject,
                    body: msg.body,
                    senderEmail: msg.senderEmail,
                    messageId: msg.messageId,
                });
            }
        }

        if (emailRecords.length === 0) return;

        // Idempotent insert: ordered:false continues on duplicate key errors
        try {
            await EmailHistory.insertMany(emailRecords, { ordered: false });
        } catch (err: any) {
            // Ignore duplicate key errors (11000)
            const nonDupErrors = err.writeErrors?.filter((e: any) => e.code !== 11000) || [];
            if (nonDupErrors.length > 0) {
                logger.error("Worker: partial insert error", {
                    errorCount: nonDupErrors.length,
                    errors: nonDupErrors.map((e: any) => e.errmsg),
                });
            }
        }

        logger.info("Worker: emails matched and inserted", {
            attempted: emailRecords.length,
            uniqueSenders: uniqueSenderEmails.length,
        });
    }

    // Update lastHistoryId in DB and Redis
    private async updateLastHistoryId(
        emailAddress: string,
        historyId: string,
        cacheKey: string,
        integrationDoc: any,
    ): Promise<void> {
        await EmailIntegration.updateOne({ email: emailAddress }, { lastHistoryId: historyId });
        integrationDoc.lastHistoryId = historyId;
        await redisClient.set(cacheKey, JSON.stringify(integrationDoc), "EX", REDIS_TTL);
    }
}

interface ParsedMessage {
    senderEmail: string;
    subject: string;
    body: string;
    messageId: string;
}

export const gmailWorkerService = new GmailWorkerService();
