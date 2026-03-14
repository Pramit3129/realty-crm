import { CloudTasksClient } from "@google-cloud/tasks";
import { env } from "./env.config";
import { logger } from "./logger";

let tasksClient: CloudTasksClient | null = null;

/**
 * Returns a singleton Cloud Tasks client.
 * Uses Application Default Credentials (ADC) on Cloud Run.
 */
function getClient(): CloudTasksClient {
    if (!tasksClient) {
        tasksClient = new CloudTasksClient();
    }
    return tasksClient;
}

/**
 * Enqueues a task to a Google Cloud Tasks queue.
 *
 * @param relativeUri - The relative path of the worker endpoint (e.g., "/api/v1/emailIntegration/webhook/worker")
 * @param payload - A JSON-serializable object to pass to the worker
 * @param queueName - The name of the queue (defaults to env.GCP_QUEUE_NAME)
 */
export async function enqueueTask(
    relativeUri: string,
    payload: Record<string, unknown>,
    queueName: string = env.GCP_QUEUE_NAME || "default-queue",
): Promise<string> {
    const projectId = env.GCP_PROJECT_ID;
    const location = env.GCP_REGION || "us-central1";

    if (!projectId) {
        throw new Error("GCP_PROJECT_ID is not defined in environment limits");
    }

    const client = getClient();
    const parent = client.queuePath(projectId, location, queueName);

    // Construct the full URL using backend url or fallback
    const baseUrl = env.BACKEND_URL || "http://localhost:3000";
    const url = `${baseUrl.replace(/\/$/, "")}${relativeUri}`;

    const task: any = {
        httpRequest: {
            httpMethod: "POST",
            url,
            headers: {
                "Content-Type": "application/json",
                // Pass internal secret for simple verification
                "x-internal-secret": env.INTERNAL_SECRET || "",
            },
            body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        },
    };

    try {
        const [response] = await client.createTask({ parent, task });
        if (!response.name) {
            throw new Error("Cloud Tasks response did not contain a task name");
        }
        return response.name;
    } catch (error: any) {
        logger.error("Failed to enqueue Cloud Task", {
            queueName,
            url,
            error: error.message,
        });
        throw error;
    }
}
