import { Resend } from "resend";
import { CampaignBatch } from "../campaign/models/campaignBatch.model";
import { Lead } from "../lead/lead.model";
import { Campaing } from "../campaign/models/campaign.model";
import { User } from "../user/user.model";
import { CampaignStep } from "../campaign/models/campaignStep.model";
import { env } from "../../shared/config/env.config";

const resend = new Resend(env.RESEND_API_KEY);

export class WorkerService {

    static async sendBatchEmailWithRetry(batchId: string): Promise<void> {

        const batchDoc = await CampaignBatch.findOneAndUpdate(
            { _id: batchId, status: "queued" },
            { $set: { status: "processing" } },
            { new: true }
        ).populate([
            { path: "stepId", select: "subject body" },
            {
                path: "campaignId",
                select: "userId status",
                populate: { path: "userId", select: "email emailCredits" }
            }
        ]).lean();

        if (!batchDoc) return;

        const step = batchDoc.stepId as any;
        if (!step) {
            throw new Error(`Campaign step not found for batch id: ${batchId}`);
        }

        const user = (batchDoc.campaignId as any)?.userId;
        const userEmail = user?.email;
        let availableCredits = user?.emailCredits ?? 0;

        const leads = batchDoc.leads || [];

        const leadIds = leads.map((l: any) => l.leadId);

        const leadDocs = await Lead.find({ _id: { $in: leadIds } }).select("_id isUnsubscribed").lean();
        const unsubscribedLeadIds = new Set(
            leadDocs.filter(d => Boolean(d.isUnsubscribed)).map(d => d._id.toString())
        );

        const backendUrl = env.BACKEND_URL || "http://localhost:3000";

        // Filter leads: must have email, not unsubscribed, and NO messageId (to avoid duplicates on resume)
        const filteredLeads = leads.filter((l: any) => 
            l?.email && 
            !unsubscribedLeadIds.has(l.leadId.toString()) &&
            !l.messageId
        );

        if (filteredLeads.length === 0) {
            // If all leads in this batch are processed or unsubscribed, mark batch as sent
            await CampaignBatch.findByIdAndUpdate(batchId, { status: "sent" });
            return;
        }

        // Credit Check
        if (availableCredits <= 0) {
            await Promise.all([
                Campaing.findByIdAndUpdate(batchDoc.campaignId, { status: "paused" }),
                CampaignBatch.findByIdAndUpdate(batchId, { status: "paused" })
            ]);
            return;
        }

        // Determine how many we can send
        const canSendCount = Math.min(filteredLeads.length, availableCredits);
        const leadsToSend = filteredLeads.slice(0, canSendCount);

        const systemReplyEmail = env.REPLY_TO_EMAIL || "replies@yourdomain.com";

        const batchPayload = leadsToSend.map((lead: any) => {
            const trackingPixel = `<img src="${backendUrl}/api/v1/campaign/track/${batchId}/${lead.leadId}?cb=${Date.now()}" width="1" height="1" style="display:none; visibility:hidden;" alt="" />`;
            const unsubscribeLink = `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; font-family: sans-serif;"><p>If you no longer wish to receive these emails, you can <a href="${backendUrl}/api/v1/campaign/unsubscribe/${lead.leadId}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.</p></div>`;

            const compiledHtml = step.body?.replace("{{name}}", lead.name || "there") + unsubscribeLink + trackingPixel;

            return {
                from: env.EMAIL_FROM || "CRM <noreply@yourdomain.com>",
                to: [lead.email],
                subject: step.subject,
                html: compiledHtml,
                reply_to: systemReplyEmail,
                ...(userEmail && {
                    cc: [userEmail]
                })
            };
        });

        try {

            const { data, error } = await resend.batch.send(batchPayload);

            if (error) {
                throw error;
            }

            if (data && Array.isArray(data)) {
                const bulkOps = data
                    .map((res: any, index: number) => {
                        const lead = leadsToSend[index];
                        if (!lead) return null;

                        return {
                            updateOne: {
                                filter: { _id: batchId, "leads.leadId": lead.leadId },
                                update: { $set: { "leads.$.messageId": res.id } }
                            }
                        };
                    })
                    .filter(Boolean) as any[];

                if (bulkOps.length > 0) {
                    await CampaignBatch.bulkWrite(bulkOps);
                }
            }

            // Decrement credits
            await User.findByIdAndUpdate(user._id, {
                $inc: { emailCredits: -leadsToSend.length }
            });

            // If we hit the credit limit before finishing the batch, pause
            if (leadsToSend.length < filteredLeads.length) {
                await Promise.all([
                    Campaing.findByIdAndUpdate(batchDoc.campaignId, { status: "paused" }),
                    CampaignBatch.findByIdAndUpdate(batchId, { status: "paused" })
                ]);
            } else {
                await CampaignBatch.findByIdAndUpdate(batchId, {
                    status: "sent"
                });
            }

        } catch (error) {

            await CampaignBatch.findByIdAndUpdate(batchId, {
                status: "failed"
            });

            throw error;
        }
    }
}