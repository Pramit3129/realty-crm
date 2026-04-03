import { env } from "./shared/config/env.config";
import { connectDB } from "./shared/config/db";
import app from "./app";
import { SchedulerService } from "./modules/scheduler/scheduler.service";

async function startServer() {
  const PORT = env.PORT || 8080;

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on port ${PORT} [${env.NODE_ENV}]`);

    try {
      await connectDB();
      console.log("Database connected");
    } catch (err) {
      console.error("DB connection failed:", err);
    }

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
