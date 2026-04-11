import { CloudTasksClient } from "@google-cloud/tasks";

export class SMS_GCP_Service {
    private static client = new CloudTasksClient();

    static async createGCPTask(enrollmentId: string, delaySeconds: number) {
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
            const queue = process.env.GCP_SMS_QUEUE_NAME;

            if (!project || !location || !queue) {
                // if (process.env.NODE_ENV === 'development') {
                //     console.log('GCP Task Queue not configured. Running in local development mode...');
                //     // Simulate a small delay and call worker directly
                //     setTimeout(async () => {
                //         try {
                //             await WorkerService.sendBatchEmailWithRetry(batchId.toString());
                //             console.log(`Local worker processed batch ${batchId}`);
                //         } catch (err) {
                //             console.error(`Local worker failed batch ${batchId}:`, err);
                //         }
                //     }, delay * 1000);
                //     return { name: 'local-dev-task' };
                // }
                throw new Error('Missing required GCP environment variables: GCP_PROJECT_ID, GCP_REGION, or GCP_QUEUE_NAME');
            }

            const workerUrl = process.env.BACKEND_URL + '/api/v1/sms/worker/send';

            const parent = this.client.queuePath(project, location, queue);
            const task = {
                scheduleTime: {
                    seconds: Math.floor(Date.now() / 1000) + delaySeconds,
                },
                httpRequest: {
                    httpMethod: 'POST' as const,
                    url: workerUrl,
                    body: Buffer.from(JSON.stringify({ enrollmentId })).toString('base64'),
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