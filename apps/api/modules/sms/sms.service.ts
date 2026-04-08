import twilio from 'twilio';
import { env } from "../../shared/config/env.config";

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
}