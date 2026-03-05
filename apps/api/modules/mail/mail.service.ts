import type mongoose from "mongoose";
import { AIMailService } from "./AI.service";
import type { ILeadsMail, IMail } from "./mail.types";
import { CloudTasksClient } from '@google-cloud/tasks';
export class MailService {

    private static client = new CloudTasksClient();

    static async generateMail(topic: string) {
        try {
            const mail: IMail | null = await AIMailService.generateMail(topic);
            if (!mail) {
                throw new Error("Failed to generate mail");
            }
            return mail;
        } catch (error) {
            throw error;
        }
    }
    static async queueMail(batchId: mongoose.Types.ObjectId, delay = 60) {
        try {

            /*
            GCP CONFIG :
            Max 5 tasks sent per second
            Max 10 running at same time
            Retry failed jobs up to 5 times

            gcloud tasks queues create <queue-name> \
            --max-dispatches-per-second=5 \
            --max-concurrent-dispatches=10 \
            --max-attempts=5
            */

            const project = process.env.GCP_PROJECT_ID;
            const location = process.env.GCP_REGION;
            const queue = process.env.GCP_QUEUE_NAME;

            if (!project || !location || !queue) {
                throw new Error('Missing required GCP environment variables: GCP_PROJECT_ID, GCP_REGION, or GCP_QUEUE_NAME');
            }

            const workerUrl = process.env.BACKEND_URL + '/api/v1/worker/send';

            const parent = this.client.queuePath(project, location, queue);
            const task = {
                scheduleTime: {
                    seconds: Math.floor(Date.now() / 1000) + delay,
                },
                httpRequest: {
                    httpMethod: 'POST' as const,
                    url: workerUrl,
                    body: Buffer.from(JSON.stringify({ batchId })).toString('base64'),
                    headers: {
                        'Content-Type': 'application/json',
                        'x-internal-header': process.env.INTERNAL_SECRET ?? '',
                    },
                },
            };
            const result = await this.client.createTask({ parent, task });
            const response = result[0];
            console.log(`Created task ${response.name}`);
            return response;
        } catch (error) {
            throw error;
        }
    }
}