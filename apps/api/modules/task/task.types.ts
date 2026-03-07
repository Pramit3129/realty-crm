import type { Types } from "mongoose";

export interface ITask {
  title: string;
  status: string;
  body: string;
  dueDate?: Date;
  assigneeId?: Types.ObjectId;
  relations: Types.ObjectId[]; // Array of lead IDs
  realtorId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskCreate {
  title: string;
  status?: string;
  body?: string;
  dueDate?: Date;
  assigneeId?: Types.ObjectId | string;
  relations?: (Types.ObjectId | string)[];
  realtorId: Types.ObjectId | string;
  workspaceId: Types.ObjectId | string;
}

export interface ITaskUpdate {
  title?: string;
  status?: string;
  body?: string;
  dueDate?: Date;
  assigneeId?: Types.ObjectId | string;
  relations?: (Types.ObjectId | string)[];
}
