import { Resend } from "resend";
import { CampaignBatch } from "../campaign/models/campaignBatch.model";
import { CampaignStep } from "../campaign/models/campaignStep.model";
import { Lead } from "../lead/lead.model";

const resend = new Resend(process.env.RESEND_API_KEY);

export class WorkerService {

    static async sendBatchEmailWithRetry(batchId: string): Promise<void> {

        const batchDoc = await CampaignBatch.findOneAndUpdate(
            { _id: batchId, status: "queued" },
            { $set: { status: "processing" } },
            { new: true }
        );

        if (!batchDoc) return;

        const step = await CampaignStep
            .findById(batchDoc.stepId)
            .select("subject body")
            .lean();

        if (!step) {
            throw new Error(`Campaign step not found for batch id: ${batchId}`);
        }

        const leads = batchDoc.leads || [];

        const leadIds = leads.map((l: any) => l.leadId);

        const leadDocs = await Lead.find({ _id: { $in: leadIds } }).select("_id isUnsubscribed").lean();
        const unsubscribedLeadIds = new Set(
            leadDocs.filter(d => Boolean(d.isUnsubscribed)).map(d => d._id.toString())
        );

        const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

        const batchPayload = leads
            .filter((l: any) => l?.email && !unsubscribedLeadIds.has(l.leadId.toString()))
            .map((lead: any) => {
                const trackingPixel = `<img src="${backendUrl}/api/v1/campaign/track/${batchId}/${lead.leadId}?cb=${Date.now()}" width="1" height="1" style="display:none; visibility:hidden;" alt="" />`;
                const unsubscribeLink = `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; font-family: sans-serif;"><p>If you no longer wish to receive these emails, you can <a href="${backendUrl}/api/v1/campaign/unsubscribe/${lead.leadId}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.</p></div>`;

                const compiledHtml = step.body?.replace("{{name}}", lead.name || "there") + unsubscribeLink + trackingPixel;

                return {
                    from: process.env.EMAIL_FROM || "CRM <noreply@yourdomain.com>",
                    to: [lead.email],
                    subject: step.subject,
                    html: compiledHtml
                };
            });

        if (batchPayload.length === 0) {
            await CampaignBatch.findByIdAndUpdate(batchId, { status: "failed" });
            return;
        }

        try {

            await resend.batch.send(batchPayload);

            await CampaignBatch.findByIdAndUpdate(batchId, {
                status: "sent"
            });

        } catch (error) {

            await CampaignBatch.findByIdAndUpdate(batchId, {
                status: "failed"
            });

            throw error;
        }
    }
}