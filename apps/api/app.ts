import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./shared/config/env.config";
import authModule from "./modules/auth/auth.module";
import userModule from "./modules/user/user.module";
import workspaceModule from "./modules/workspace/workspace.module";
import membershipModule from "./modules/memberships/memberships.module";
import leadModule from "./modules/lead/lead.module";
import pipelineModule from "./modules/pipeline/pipeline.module";
import pipelineStageModule from "./modules/pipelineStage/pipelineStage.module";
import mailModule from "./modules/mail/mail.module";
import campaignModule from "./modules/campaign/campaign.module";
import noteModule from "./modules/note/note.module";
import workerModule from "./modules/worker/worker.module";
import schedulerModule from "./modules/scheduler/scheduler.module";
import taskModule from "./modules/task/task.module";
import emailIntegrationModule from "./modules/emailIntegration/emailIntegration.module";
const app = express();

// ── Global Middleware ─────────────────────────────────────────────────
const corsOrigin = env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",");
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// ── Health Check ──────────────────────────────────────────────────────
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

// ── Module Routes ─────────────────────────────────────────────────────
app.use("/api/v1/auth", authModule);
app.use("/api/v1/user", userModule);
app.use("/api/v1/workspace", workspaceModule);
app.use("/api/v1/memberships", membershipModule);
app.use("/api/v1/lead", leadModule);
app.use("/api/v1/pipeline", pipelineModule);
app.use("/api/v1/pipeline-stage", pipelineStageModule);
app.use("/api/v1/mail", mailModule);
app.use("/api/v1/campaign", campaignModule);
app.use("/api/v1/note", noteModule);
app.use("/api/v1/task", taskModule);
app.use("/api/v1/worker", workerModule);
app.use("/api/v1/scheduler", schedulerModule);
app.use("/api/v1/emailIntegration", emailIntegrationModule);

export default app;
