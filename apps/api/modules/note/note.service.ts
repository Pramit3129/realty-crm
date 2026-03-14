import { Note } from "./note.model";
import type { INoteCreate, INoteUpdate } from "./note.types";
import { Membership } from "../memberships/memberships.model";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "../activity/activity.types";

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
    const savedNote = await note.save();

    // Log activity for each related lead
    if (noteData.relations && noteData.relations.length > 0) {
      for (const leadId of noteData.relations) {
        await ActivityService.logActivity({
          leadId: leadId.toString(),
          realtorId: noteData.realtorId.toString(),
          type: ActivityType.NOTE_ADDED,
          content: `Added a note: ${noteData.body ? (noteData.body.substring(0, 50) + (noteData.body.length > 50 ? "..." : "")) : ""}`
        });
      }
    }

    return savedNote;
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

    const query: any = { workspaceId, realtorId };

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
