import mongoose from "mongoose";
import type { INote } from "./note.types";

const noteSchema = new mongoose.Schema<INote>(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: "",
    },
    relations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Lead",
      },
    ],
    realtorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

noteSchema.index({ workspaceId: 1, realtorId: 1 });
noteSchema.index({ relations: 1 });

export const Note = mongoose.model<INote>("Note", noteSchema);
