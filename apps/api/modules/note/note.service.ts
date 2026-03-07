import { Note } from "./note.model";
import type { INoteCreate, INoteUpdate } from "./note.types";
import { Membership } from "../memberships/memberships.model";

export class NoteService {
  static async createNote(noteData: INoteCreate) {
    const checkWorkspace = await Membership.findOne({
      workspace: noteData.workspaceId,
      user: noteData.realtorId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }

    const note = new Note(noteData);
    return await note.save();
  }

  static async getNotes(workspaceId: string, realtorId: string) {
    const membership = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    const roleInWorkspace = membership.role;
    const query: any = { workspaceId };

    if (roleInWorkspace !== "OWNER") {
      query.realtorId = realtorId;
    }

    return await Note.find(query)
      .populate("relations", "name email")
      .populate("realtorId", "name")
      .sort({ createdAt: -1 })
      .lean();
  }

  static async getNotesByLead(leadId: string, workspaceId: string, realtorId: string) {
    return await Note.find({
      workspaceId,
      relations: leadId,
    })
      .populate("realtorId", "name")
      .sort({ createdAt: -1 })
      .lean();
  }

  static async updateNote(realtorId: string, noteId: string, noteData: INoteUpdate) {
    return await Note.findOneAndUpdate(
      { realtorId, _id: noteId },
      noteData,
      { new: true, runValidators: true }
    ).lean();
  }

  static async deleteNote(realtorId: string, noteId: string) {
    return await Note.findOneAndDelete({ realtorId, _id: noteId }).lean();
  }
}
