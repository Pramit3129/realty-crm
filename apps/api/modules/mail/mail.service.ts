import { AIMailService } from "./AI.service";
import type { Mail } from "./mail.types";


export class MailService {

    static async generateMail(topic: string) {
        try {
            const mail: Mail | null = await AIMailService.generateMail(topic);
            if (!mail) {
                throw new Error("Failed to generate mail");
            }
            return mail;
        } catch (error) {
            throw error;
        }
    }
}