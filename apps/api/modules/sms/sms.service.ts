import twilio from 'twilio';
import { env } from "../../shared/config/env.config";
import type { Istep, ICampaignEnrollment, ISmsCampaign } from './sms.types';
import { SMSNumber } from './models/smsNumber.model';
import { SMSCampaign } from './models/smsCampaing.model';
import { CampaignEnrollment } from './models/smsCampaingEnrollment.model';
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
            smsUrl: `${APP_URL}/api/v1/sms/webhook/inbound`
        });

        await SMSNumber.create({ userId: user._id, number: bought.phoneNumber, accountSid: sub.sid });
    }

    static async assignCampaign(leadId: string, stepIndex = 0, campaignId: string = 'default') {

        let campaign: ISmsCampaign | null;

        if (campaignId === 'default') {
            campaign = await SMSCampaign.findOne({ isDefault: true });
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
            await SMS_GCP_Service.createGCPTask(enrollment._id.toString(), step.delaySeconds);
            return { message: "Campaign assigned successfully", enrollment };
        }
        else {
            return { message: "Campaign assigned successfully", enrollment };
        }
    }

}