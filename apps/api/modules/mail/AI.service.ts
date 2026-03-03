import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.js";
import { z } from "zod";



export class AIMailService {
    static OPENAI_API_KEY = this.loadApiKey();
    static openai = new OpenAI({
        apiKey: this.OPENAI_API_KEY,
    });

    static loadApiKey() {
        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            console.error("OpenAI API Key not found");
            return undefined;
        }
        return key;
    }

    static async generateMail(topic: string) {
        const mailSchema = z.object({
            subject: z.string().describe("Subject of the mail"),
            body: z.string().describe("Body of the mail"),
        });
        try {
            const mail = await AIMailService.openai.responses.parse({
                model: "gpt-4.1-nano",
                input: [
                    { role: "system", content: "You are a mail writer expert for leads." },
                    { role: "user", content: `Generate a mail for the following topic: ${topic}` },
                ],
                text: { format: zodTextFormat(mailSchema, "mail format") },
            });
            return mail.output_parsed;
        } catch (error) {
            throw error;
        }
    }
}