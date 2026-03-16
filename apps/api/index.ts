import { env } from "./shared/config/env.config";
import { connectDB } from "./shared/config/db";
import app from "./app";
import { SchedulerService } from "./modules/scheduler/scheduler.service";

async function startServer() {
    await connectDB();

    app.listen(env.PORT, () => {
        console.log(
            `Server running on port ${env.PORT} [${env.NODE_ENV}]`,
        );

        if (env.NODE_ENV === "development") {
            console.log("Development mode: Starting local scheduler (every 60s)...");
            let running = false;
            setInterval(async () => {
                if (running) {
                    console.warn("[scheduler] previous tick still running — skipping");
                    return;
                }
                running = true;
                try {
                    const stats = await SchedulerService.run();
                    console.log("[scheduler] dev tick:", stats);
                } catch (err) {
                    console.error("[scheduler] dev tick error:", err);
                } finally {
                    running = false;
                }
            }, 60000);
        }
    });
}

startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});