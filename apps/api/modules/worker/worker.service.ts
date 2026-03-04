import { Resend } from "resend";
import Mail from "../mail/mail.model";
import { Lead } from "../lead/lead.model";

const resend = new Resend(process.env.RESEND_API_KEY);

export class WorkerService {

    static async sendBatchEmailWithRetry(
        mailId: string,
        attempt = 1
    ): Promise<void> {

        const mailDoc = await Mail.findById(mailId);
        if (!mailDoc) {
            throw new Error(`Mail document not found for id: ${mailId}`);
        }

        const leadIds = mailDoc.leads.map((l: any) => l.leadId);
        const leads = await Lead.find({ _id: { $in: leadIds } }).select("email name");

        if (leads.length === 0) {
            throw new Error(`No leads found for mail id: ${mailId}`);
        }

        try {

            const batchPayload = leads.map((lead) => {
                return {
                    from: "CRM <noreply@yourdomain.com>",
                    to: [lead.email],
                    subject: mailDoc.subject,
                    html: mailDoc.body.replace("{{name}}", lead.name),
                }
            });

            await resend.batch.send(batchPayload);
            await Mail.findByIdAndUpdate(mailId, { status: "sent" });

        } catch (error: any) {

            if (error.status === 429 && attempt <= 3) {
                const delay = 1000 * attempt;

                await new Promise((r) => setTimeout(r, delay));

                return WorkerService.sendBatchEmailWithRetry(
                    mailId,
                    attempt + 1
                );
            }

            await Mail.findByIdAndUpdate(mailId, { status: "failed" });
            throw error;
        }
    }
}