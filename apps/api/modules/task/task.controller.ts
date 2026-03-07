import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { TaskService } from "./task.service";

// POST /create
export async function createTask(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const { title, status, body, dueDate, assigneeId, relations, workspaceId } = authReq.body;
    const realtorId = authReq.user.id;
    const task = await TaskService.createTask({
      title,
      status,
      body,
      dueDate,
      assigneeId,
      relations,
      realtorId,
      workspaceId,
    });
    res.status(201).json({ task });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create task" });
  }
}

// GET /workspace/:workspaceId
export async function getTasks(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const workspaceId = req.params.workspaceId as string;
    const tasks = await TaskService.getTasks(workspaceId, authReq.user.id);
    res.status(200).json({ tasks });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch tasks" });
  }
}

// GET /lead/:leadId/workspace/:workspaceId
export async function getTasksByLead(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const leadId = req.params.leadId as string;
    const workspaceId = req.params.workspaceId as string;
    const tasks = await TaskService.getTasksByLead(
      leadId,
      workspaceId,
      authReq.user.id
    );
    res.status(200).json({ tasks });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch lead tasks" });
  }
}

// PUT /details/:id
export async function updateTask(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const taskId = req.params.id as string;
    const realtorId = authReq.user.id;
    const { title, status, body, dueDate, assigneeId, relations } = req.body;
    const task = await TaskService.updateTask(realtorId, taskId, {
      title,
      status,
      body,
      dueDate,
      assigneeId,
      relations,
    });
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.status(200).json({ task });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update task" });
  }
}

// DELETE /details/:id
export async function deleteTask(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const taskId = req.params.id as string;
    const realtorId = authReq.user.id;
    const task = await TaskService.deleteTask(realtorId, taskId);
    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }
    res.status(200).json({ task });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete task" });
  }
}
