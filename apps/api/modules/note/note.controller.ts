import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { NoteService } from "./note.service";

// POST /create
export async function createNote(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const { title, body, relations, workspaceId } = authReq.body;
    const realtorId = authReq.user.id;
    const note = await NoteService.createNote({
      title,
      body,
      relations,
      realtorId,
      workspaceId,
    });
    res.status(201).json({ note });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to create note" });
  }
}

// GET /workspace/:workspaceId
export async function getNotes(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const workspaceId = req.params.workspaceId as string;
    const notes = await NoteService.getNotes(workspaceId, authReq.user.id);
    res.status(200).json({ notes });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch notes" });
  }
}

// GET /lead/:leadId/workspace/:workspaceId
export async function getNotesByLead(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const leadId = req.params.leadId as string;
    const workspaceId = req.params.workspaceId as string;
    const notes = await NoteService.getNotesByLead(
      leadId,
      workspaceId,
      authReq.user.id
    );
    res.status(200).json({ notes });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to fetch lead notes" });
  }
}

// PUT /details/:id
export async function updateNote(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const noteId = req.params.id as string;
    const realtorId = authReq.user.id;
    const { title, body, relations } = req.body;
    const note = await NoteService.updateNote(realtorId, noteId, {
      title,
      body,
      relations,
    });
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }
    res.status(200).json({ note });
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Failed to update note" });
  }
}

// DELETE /details/:id
export async function deleteNote(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const noteId = req.params.id as string;
    const realtorId = authReq.user.id;
    const note = await NoteService.deleteNote(realtorId, noteId);
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }
    res.status(200).json({ note });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to delete note" });
  }
}
