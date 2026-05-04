import type { Request, Response } from "express";
import { TagService } from "./tag.service";
import { createTagSchema, updateTagSchema } from "./tag.schema";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";

export class TagController {
  static async createTag(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = req.headers["x-workspace-id"] as string;
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required in headers" });
      }

      const validatedData = createTagSchema.parse(req.body);
      const tag = await TagService.createTag({
        ...validatedData,
        userId: authReq.user.id,
        workspaceId,
      });

      res.status(201).json(tag);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async getTags(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = req.headers["x-workspace-id"] as string;
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required in headers" });
      }

      const tags = await TagService.getTags(workspaceId, authReq.user.id);
      res.status(200).json(tags);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateTag(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = req.headers["x-workspace-id"] as string;
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required in headers" });
      }

      const id = req.params.id as string;
      const validatedData = updateTagSchema.parse(req.body);
      
      const updatedTag = await TagService.updateTag(
        id,
        validatedData,
        authReq.user.id,
        workspaceId
      );

      res.status(200).json(updatedTag);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteTag(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = req.headers["x-workspace-id"] as string;
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required in headers" });
      }

      const id = req.params.id as string;
      const deletedTag = await TagService.deleteTag(id, authReq.user.id, workspaceId);

      res.status(200).json(deletedTag);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getFilterSchema(req: Request, res: Response) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = req.headers["x-workspace-id"] as string;
      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required in headers" });
      }

      const schema = await TagService.getFilterSchema(workspaceId, authReq.user.id);
      res.status(200).json(schema);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
