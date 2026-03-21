import type { Request, Response } from "express";
import { trackerService } from "./tracker.service";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";

export const trackBatch = async (req: Request, res: Response) => {
  try {
    const { apiKey, visitorId, events } = req.body;

    if (typeof apiKey !== "string" || apiKey.length > 100) {
      return res.status(400).send("Invalid apiKey");
    }

    if (typeof visitorId !== "string" || visitorId.length > 100) {
      return res.status(400).send("Invalid visitorId");
    }

    if (!Array.isArray(events) || events.length === 0 || events.length > 50) {
      return res.status(400).send("Invalid events payload");
    }

    const origin = req.headers.origin || req.headers.referer || "";
    const userAgent = req.headers["user-agent"] || "";

    await trackerService.processBatchEvents(apiKey, visitorId, events, origin, userAgent as string);
    
    return res.sendStatus(200);
  } catch (err: any) {
    if (err.message === "INVALID_API_KEY") {
        return res.status(403).send("Invalid API key");
    }
    if (err.message === "INVALID_DOMAIN") {
        return res.status(403).send("Invalid domain");
    }
    console.error("Track batch error:", err);
    return res.sendStatus(500);
  }
};

export const identifyVisitor = async (req: Request, res: Response) => {
  try {
    const { apiKey, visitorId, email, name } = req.body;

    if (!email) {
      return res.status(400).send("Email required");
    }

    if (typeof apiKey !== "string" || apiKey.length > 100) {
      return res.status(400).send("Invalid apiKey");
    }

    if (typeof visitorId !== "string" || visitorId.length > 100) {
      return res.status(400).send("Invalid visitorId");
    }

    const origin = req.headers.origin || req.headers.referer || "";

    const lead = await trackerService.identifyVisitor(apiKey, visitorId, email, name, origin);
    
    return res.json({ success: true, lead });
  } catch (err: any) {
    if (err.message === "INVALID_API_KEY") {
        return res.status(403).send("Invalid API key");
    }
    if (err.message === "INVALID_DOMAIN") {
        return res.status(403).send("Invalid domain");
    }
    console.error("Identify error:", err);
    return res.sendStatus(500);
  }
};

export const getWorkspaceEvents = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const data = await trackerService.getEvents(workspaceId, page, limit);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Get workspace events error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getWorkspaceVisitors = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const data = await trackerService.getVisitors(workspaceId, page, limit);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Get workspace visitors error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const generateApiKey = async (req: Request, res: Response) => {
  try {
    const authUser = req as AuthenticatedRequest;
    const { workspaceId, domain } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId is required" });
    }

    const newApiKey = await trackerService.generateApiKey(workspaceId, authUser.user.id, domain);
    return res.json({ success: true, apiKey: newApiKey });
  } catch (err: any) {
    if (err.message === "WORKSPACE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Workspace not found or unauthorized" });
    }
    if (err.message === "DOMAIN_ALREADY_IN_USE") {
      return res.status(409).json({ success: false, message: "This domain is already registered to another user" });
    }
    if (err.message === "INVALID_DOMAIN_FORMAT") {
      return res.status(400).json({ success: false, message: "Invalid domain format. Please enter a valid URL or hostname." });
    }
    console.error("Generate API key error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getTrackerDetails = async (req: Request, res: Response) => {
  try {
    const authUser = req as AuthenticatedRequest;
    const workspaceId = req.params.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId is required" });
    }

    const details = await trackerService.getTrackerDetails(workspaceId as string, authUser.user.id);
    return res.json({ success: true, ...details });
  } catch (err: any) {
    if (err.message === "API_KEY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "API key not found. Please generate one." });
    }
    if (err.message === "WORKSPACE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Workspace not found or unauthorized" });
    }
    console.error("Get tracker details error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId as string;

    const stats = await trackerService.getDashboardStats(workspaceId);
    return res.json({ success: true, ...stats });
  } catch (err: any) {
    console.error("Get dashboard stats error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
