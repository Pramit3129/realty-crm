import mongoose from "mongoose";
import type { ITask } from "./task.types";

const taskSchema = new mongoose.Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "To do", // "To do", "In progress", "Done", "No Value"
    },
    body: {
      type: String,
      default: "",
    },
    dueDate: {
      type: Date,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

taskSchema.index({ workspaceId: 1, realtorId: 1 });
taskSchema.index({ relations: 1 });

export const Task = mongoose.model<ITask>("Task", taskSchema);
