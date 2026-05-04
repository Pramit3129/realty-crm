import { Tag } from "./tag.model";
import { Membership } from "../memberships/memberships.model";
import { Lead } from "../lead/lead.model";
import type { ITagCreate, ITagUpdate } from "./tag.types";
import mongoose from "mongoose";

export class TagService {
  static async createTag(tagData: ITagCreate) {
    const checkWorkspace = await Membership.findOne({
      workspace: tagData.workspaceId,
      user: tagData.userId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }

    const existingTag = await Tag.findOne({
      workspaceId: tagData.workspaceId,
      userId: tagData.userId,
      name: { $regex: new RegExp(`^${tagData.name}$`, "i") },
    });

    if (existingTag) {
      throw new Error("A tag with this name already exists");
    }

    const tag = new Tag(tagData);
    return await tag.save();
  }

  static async getTags(workspaceId: string, userId: string) {
    const checkWorkspace = await Membership.findOne({
      workspace: workspaceId,
      user: userId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }

    return await Tag.find({ workspaceId, userId }).lean();
  }

  static async updateTag(tagId: string, tagData: ITagUpdate, userId: string, workspaceId: string) {
    const checkWorkspace = await Membership.findOne({
      workspace: workspaceId,
      user: userId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }

    if (tagData.name) {
      const existingTag = await Tag.findOne({
        workspaceId,
        userId,
        name: { $regex: new RegExp(`^${tagData.name}$`, "i") },
        _id: { $ne: tagId },
      });

      if (existingTag) {
        throw new Error("A tag with this name already exists");
      }
    }

    const updatedTag = await Tag.findOneAndUpdate(
      { _id: tagId, userId, workspaceId },
      tagData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedTag) {
      throw new Error("Tag not found or not authorized to update");
    }

    return updatedTag;
  }

  static async deleteTag(tagId: string, userId: string, workspaceId: string) {
    const checkWorkspace = await Membership.findOne({
      workspace: workspaceId,
      user: userId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }

    const deletedTag = await Tag.findOneAndDelete({ _id: tagId, userId, workspaceId }).lean();
    
    if (!deletedTag) {
      throw new Error("Tag not found or not authorized to delete");
    }

    // Ideally, for manual tags, we should remove the tagId from leads here.
    // That logic will be placed in the controller or a background worker, or handled by the Lead model logic lazily.

    return deletedTag;
  }

  static async getFilterSchema(workspaceId: string, userId: string) {
    const userMembership = await Membership.findOne({
      workspace: workspaceId,
      user: userId,
      isRemoved: false,
    });

    if (!userMembership) {
      throw new Error("You are not a member of this workspace");
    }

    const members = await Membership.find({
      workspace: workspaceId,
      isRemoved: false,
    }).populate("user", "name");

    const agentOptions = members
      .filter((m: any) => m.user)
      .map((m: any) => ({
        label: m.user.name,
        value: m.user._id.toString(),
      }));

    const standardFields: any[] = [
      { key: "name", label: "Lead Name", type: "text" },
      { key: "email", label: "Email Address", type: "text" },
      { key: "phone", label: "Phone Number", type: "text" },
      { key: "city", label: "City", type: "text" },
      { key: "source", label: "Lead Source", type: "text" },
      { key: "status", label: "Current Status", type: "text" },
      { key: "type", label: "Lead Type", type: "select", options: ["BUYER", "SELLER"] },
    ];

    if (userMembership.role === "OWNER") {
      standardFields.push({ key: "realtorId", label: "Agent", type: "select", options: agentOptions });
    }

    // Discovery: Find all unique keys used in extra_fields for this workspace
    // We limit to 1000 most recent leads to keep it fast
    const extraFieldsDiscovery = await Lead.aggregate([
      { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
      { $sort: { createdAt: -1 } },
      { $limit: 1000 },
      { $project: { kv: { $objectToArray: "$extra_fields" } } },
      { $unwind: "$kv" },
      { $group: { _id: null, keys: { $addToSet: "$kv.k" } } }
    ]);

    const discoveredKeys = extraFieldsDiscovery[0]?.keys || [];
    const extraFields = discoveredKeys.map((key: string) => ({
      key: `extra_fields.${key}`,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      type: "custom"
    }));

    return {
      standard: standardFields,
      custom: extraFields,
    };
  }
}
