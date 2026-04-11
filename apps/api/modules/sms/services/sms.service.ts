import twilio from 'twilio';
import mongoose from 'mongoose';
import { env } from "../../../shared/config/env.config";
import type { Istep, ICampaignEnrollment, ISmsCampaign } from '../sms.types';
import { SMSNumber } from '../models/smsNumber.model';
import { SMSCampaign } from '../models/smsCampaing.model';
import { CampaignEnrollment } from '../models/smsCampaingEnrollment.model';
import { SMS_GCP_Service } from './sms.gcp.service';
const APP_URL = env.APP_URL;

export class SMS_Service {
    private static _client: any;

    private static get client() {
        if (!this._client) {
            this.load();
        }
        return this._client;
    }

    static load() {
        const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = env;
        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
            this._client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        } else {
            console.warn("[SMS_Service] Twilio credentials not fully configured in environment.");
        }
    }

    static async sendSMS(to: string, from: string, message: string) {
        if (!this.client) {
            throw new Error("SMS Service not initialized. Check Twilio configuration.");
        }

        try {
            const response = await this.client.messages.create({
                body: message,
                from: from,
                to: to
            });
            return response;
        } catch (error) {
            console.error("[SMS_Service] Error sending SMS:", error);
            throw error;
        }
    }

    static async onboardUser(user: { _id: any; email: string }, country = 'US', areaCode = 512) {
        const sub = await this.client.api.v2010.accounts.create({ friendlyName: user.email });

        const [num] = await this.client.availablePhoneNumbers(country).local.list({ areaCode, limit: 1 });

        const bought = await this.client.incomingPhoneNumbers.create({
            phoneNumber: num.phoneNumber,
            accountSid: sub.sid,
            smsUrl: `${APP_URL}/api/v1/sms/webhook/inbound`,
            statusCallback: `${APP_URL}/api/v1/sms/webhook/status`
        });

        await SMSNumber.create({ userId: user._id, number: bought.phoneNumber, accountSid: sub.sid });
    }

    static async assignCampaign(leadId: string, stepIndex = 0, campaignId: string = 'default') {

        let campaign: ISmsCampaign | null;

        if (campaignId === 'default') {
            const lead = await mongoose.model("Lead").findById(leadId).select("userId").lean();
            if (!lead) return { message: "Lead not found" };
            campaign = await SMSCampaign.findOne({ isDefault: true, userId: (lead as any).userId });
        } else {
            campaign = await SMSCampaign.findById(campaignId);
        }

        if (!campaign) {
            return { message: "Campaign not found" };
        }
        const step: Istep | null = campaign.steps[stepIndex]!;
        if (!step) {
            return { message: "Invalid Step or Step not found" };
        }
        const sendTime = new Date(Date.now() + (step.delaySeconds * 1000));
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

        // Decision: Task Queue or Database "Parking"
        const isNearFuture = sendTime <= twoHoursFromNow;

        const enrollment = await CampaignEnrollment.findOneAndUpdate(
            { leadId, campaignId },
            {
                currentStepIndex: stepIndex,
                nextSmsTime: sendTime,
                status: isNearFuture ? 'QUEUED_IN_TASKS' : 'AWAITING_CRON'
            },
            { upsert: true, new: true }
        );

        if (isNearFuture) {
            // Push directly to GCP Cloud Tasks
            await SMS_GCP_Service.createGCPTask(
                enrollment._id.toString(),
                step.delaySeconds,
                enrollment.campaignId.toString(),
                stepIndex
            );
            return { message: "Campaign assigned successfully", enrollment };
        }
        else {
            return { message: "Campaign assigned successfully", enrollment };
        }
    }

    static async assignCampaigns(leadIds: string[], stepIndex = 0, campaignId: string = 'default') {
        
        let campaign: ISmsCampaign | null;
        if (campaignId === 'default') {
            if (leadIds.length === 0) return { message: "No leads provided", results: [] };
            const firstLead = await mongoose.model("Lead").findById(leadIds[0]).select("userId").lean();
            if (!firstLead) return { message: "Lead context missing", results: [] };
            campaign = await SMSCampaign.findOne({ isDefault: true, userId: (firstLead as any).userId });
        } else {
            campaign = await SMSCampaign.findById(campaignId);
        }

        if (!campaign) {
            return { message: "Campaign not found", results: [] };
        }

        const step: Istep | null = campaign.steps[stepIndex]!;
        if (!step) {
            return { message: "Invalid Step or Step not found", results: [] };
        }

        const resolvedCampaignId = (campaign as any)._id;
        const sendTime = new Date(Date.now() + (step.delaySeconds * 1000));
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const isNearFuture = sendTime <= twoHoursFromNow;
        const status = isNearFuture ? 'QUEUED_IN_TASKS' as const : 'AWAITING_CRON' as const;

        // 2) Bulk upsert all enrollments in a single DB round-trip
        const bulkOps = leadIds.map(leadId => ({
            updateOne: {
                filter: { leadId, campaignId: resolvedCampaignId },
                update: {
                    $set: {
                        currentStepIndex: stepIndex,
                        nextSmsTime: sendTime,
                        status,
                    },
                },
                upsert: true,
            },
        }));

        const bulkResult = await CampaignEnrollment.bulkWrite(bulkOps, { ordered: false });

        // 3) If near-future, fetch enrollment IDs and batch-create GCP tasks
        const gcpResults: { leadId: string; taskCreated: boolean; error?: string }[] = [];

        if (isNearFuture) {
            const enrollments = await CampaignEnrollment.find({
                leadId: { $in: leadIds },
                campaignId: resolvedCampaignId,
            }).select('_id leadId').lean();

            const taskPromises = enrollments.map(enrollment =>
                SMS_GCP_Service.createGCPTask(
                    enrollment._id.toString(),
                    step.delaySeconds,
                    resolvedCampaignId.toString(),
                    stepIndex
                )
                    .then(() => ({
                        leadId: enrollment.leadId.toString(),
                        taskCreated: true,
                    }))
                    .catch((err: any) => ({
                        leadId: enrollment.leadId.toString(),
                        taskCreated: false,
                        error: err.message || 'Failed to create GCP task',
                    }))
            );

            const settled = await Promise.allSettled(taskPromises);
            for (const result of settled) {
                if (result.status === 'fulfilled') {
                    gcpResults.push(result.value);
                }
            }
        }

        return {
            message: "Campaigns assigned successfully",
            summary: {
                totalLeads: leadIds.length,
                matched: bulkResult.matchedCount,
                upserted: bulkResult.upsertedCount,
                modified: bulkResult.modifiedCount,
            },
            gcpResults: isNearFuture ? gcpResults : undefined,
        };
    }

    // ── SMS Campaign CRUD ─────────────────────────────────────────────

    static async createCampaign(
        userId: string,
        data: { name: string; steps: Istep[]; isActive?: boolean; isDefault?: boolean }
    ) {
        // If this campaign is marked as default, unset any existing default for the user
        if (data.isDefault) {
            await SMSCampaign.updateMany({ userId, isDefault: true }, { isDefault: false });
        }

        const campaign = await SMSCampaign.create({
            userId,
            name: data.name,
            steps: data.steps,
            isActive: data.isActive ?? true,
            isDefault: data.isDefault ?? false,
        });

        return campaign;
    }

    static async getCampaigns(userId: string) {
        const campaigns = await SMSCampaign.find({ userId })
            .sort({ createdAt: -1 })
            .lean();
        return campaigns;
    }

    static async getCampaignById(campaignId: string, userId: string) {
        const campaign = await SMSCampaign.findOne({ _id: campaignId, userId }).lean();
        return campaign;
    }

    static async updateCampaign(
        campaignId: string,
        userId: string,
        data: { name?: string; isActive?: boolean; isDefault?: boolean }
    ) {
        // If this campaign is being set as default, unset any existing default for the user
        if (data.isDefault) {
            await SMSCampaign.updateMany(
                { userId, isDefault: true, _id: { $ne: campaignId } },
                { isDefault: false }
            );
        }

        const campaign = await SMSCampaign.findOneAndUpdate(
            { _id: campaignId, userId },
            { $set: data },
            { new: true }
        ).lean();

        return campaign;
    }

    static async deleteCampaign(campaignId: string, userId: string) {
        const campaign = await SMSCampaign.findOneAndDelete({ _id: campaignId, userId }).lean();
        if (!campaign) return null;

        // Clean up related enrollments
        await CampaignEnrollment.deleteMany({ campaignId });
        return campaign;
    }

    // ── Step Management ───────────────────────────────────────────────

    static async addStep(campaignId: string, userId: string, step: Istep) {
        const campaign = await SMSCampaign.findOneAndUpdate(
            { _id: campaignId, userId },
            { $push: { steps: step } },
            { new: true }
        ).lean();
        return campaign;
    }

    static async updateStep(
        campaignId: string,
        userId: string,
        stepIndex: number,
        data: { delaySeconds?: number; message?: string }
    ) {
        const setFields: Record<string, any> = {};
        if (data.delaySeconds !== undefined) {
            setFields[`steps.${stepIndex}.delaySeconds`] = data.delaySeconds;
        }
        if (data.message !== undefined) {
            setFields[`steps.${stepIndex}.message`] = data.message;
        }

        const campaign = await SMSCampaign.findOneAndUpdate(
            { _id: campaignId, userId, [`steps.${stepIndex}`]: { $exists: true } },
            { $set: setFields },
            { new: true }
        ).lean();

        return campaign;
    }

    static async deleteStep(campaignId: string, userId: string, stepIndex: number) {
        // First verify ownership and that the step exists
        const campaign = await SMSCampaign.findOne({ _id: campaignId, userId }).lean();
        if (!campaign) return null;
        if (!campaign.steps[stepIndex]) return null;

        // Remove the step by unsetting it and then pulling nulls
        await SMSCampaign.updateOne(
            { _id: campaignId, userId },
            { $unset: { [`steps.${stepIndex}`]: 1 } }
        );
        const updated = await SMSCampaign.findOneAndUpdate(
            { _id: campaignId, userId },
            { $pull: { steps: null as any } },
            { new: true }
        ).lean();

        // Re-index stepIndex values sequentially
        if (updated && updated.steps.length > 0) {
            const reindexed = updated.steps.map((s: any, i: number) => ({
                ...s,
                stepIndex: i,
            }));
            await SMSCampaign.updateOne({ _id: campaignId }, { steps: reindexed });
            return { ...updated, steps: reindexed };
        }

        return updated;
    }

    // ── Worker Task Processing ────────────────────────────────────────

    static async processWorkerTask(enrollmentId: string, campaignIdAtTimeOfScheduling: string, stepIndexAtTimeOfScheduling: number) {
        // 1. One DB read to fetch Enrollment, Lead, Phone line, and Campaign simultaneously 
        const dbResult = await CampaignEnrollment.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(enrollmentId) } },
            {
                $lookup: {
                    from: "leads",
                    localField: "leadId",
                    foreignField: "_id",
                    as: "lead"
                }
            },
            { $unwind: "$lead" },
            {
                $lookup: {
                    from: "smsnumbers",
                    localField: "lead.userId",
                    foreignField: "userId",
                    as: "phoneLine"
                }
            },
            { $unwind: { path: "$phoneLine", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "smscampaigns",
                    localField: "campaignId",
                    foreignField: "_id",
                    as: "campaign"
                }
            },
            { $unwind: { path: "$campaign", preserveNullAndEmptyArrays: true } }
        ]);

        if (!dbResult || dbResult.length === 0) {
            return { message: "Task discarded: Enrollment or Lead not found." };
        }

        const unifiedData = dbResult[0];
        const currentCampaignId = unifiedData.campaignId.toString();

        // 2. THE AUTO-CORRECT LOGIC
        if (currentCampaignId !== campaignIdAtTimeOfScheduling) {
            console.log("Campaign mismatch detected! User changed the campaign. Restarting at Step 1...");
            await this.assignCampaign(unifiedData.lead._id.toString(), 0, currentCampaignId);
            return { message: "Task discarded: Lead moved to a new campaign." };
        }

        if (unifiedData.currentStepIndex !== stepIndexAtTimeOfScheduling) {
            console.log("Step mismatch! User manually skipped steps or reset. Discarding old task.");
            return { message: "Task discarded: Step index is outdated." };
        }

        if (!unifiedData.phoneLine) {
            return { message: "Task discarded: No SMS number found for user." };
        }

        if (!unifiedData.campaign || !unifiedData.campaign.steps[unifiedData.currentStepIndex]) {
            return { message: "Task discarded: Campaign or step not found." };
        }

        const step = unifiedData.campaign.steps[unifiedData.currentStepIndex];
        const leadPhone = unifiedData.lead.phone as string | undefined;
        const fromNumber = unifiedData.phoneLine.number as string | undefined;
        
        // 4. Dispatch actual SMS message
        // TS Typings strictly check strings to prevent TS2345
        if (leadPhone && fromNumber) {
            await this.sendSMS(leadPhone, fromNumber, step.message);
        }

        // 5. Compute and inline the next step's database assignments
        const nextStepIndex = unifiedData.currentStepIndex + 1;
        if (nextStepIndex < unifiedData.campaign.steps.length) {
            const nextStep = unifiedData.campaign.steps[nextStepIndex];
            const sendTime = new Date(Date.now() + (nextStep.delaySeconds * 1000));
            const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
            const isNearFuture = sendTime <= twoHoursFromNow;

            await CampaignEnrollment.updateOne(
                { _id: new mongoose.Types.ObjectId(enrollmentId) },
                {
                    $set: {
                        currentStepIndex: nextStepIndex,
                        nextSmsTime: sendTime,
                        status: isNearFuture ? 'QUEUED_IN_TASKS' : 'AWAITING_CRON'
                    }
                }
            );

            if (isNearFuture) {
                await SMS_GCP_Service.createGCPTask(
                    enrollmentId,
                    nextStep.delaySeconds,
                    currentCampaignId,
                    nextStepIndex
                );
            }
        } else {
            // Campaign sequence completed
            await CampaignEnrollment.updateOne(
                { _id: new mongoose.Types.ObjectId(enrollmentId) },
                { $set: { status: 'COMPLETED' } }
            );
        }

        return { message: "Task processed successfully." };
    }
}
