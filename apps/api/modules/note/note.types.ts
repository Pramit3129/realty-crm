import type { Types } from "mongoose";

export interface INote {
  title: string;
  body: string;
  relations: Types.ObjectId[]; // Array of lead IDs
  realtorId: Types.ObjectId;
  workspaceId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface INoteCreate {
  title: string;
  body?: string;
  relations?: (Types.ObjectId | string)[];
  realtorId: Types.ObjectId | string;
  workspaceId: Types.ObjectId | string;
}

export interface INoteUpdate {
  title?: string;
  body?: string;
  relations?: (Types.ObjectId | string)[];
}
