import { Task } from "./task.model";
import type { ITaskCreate, ITaskUpdate } from "./task.types";
import { Membership } from "../memberships/memberships.model";
import { Lead } from "../lead/lead.model";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "../activity/activity.types";

export class TaskService {
  static async createTask(taskData: ITaskCreate) {
    const membership = await Membership.findOne({
      workspace: taskData.workspaceId,
      user: taskData.realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    // Role check: Only OWNER can assign to others
    if (membership.role !== "OWNER") {
      if (taskData.assigneeId && taskData.assigneeId.toString() !== taskData.realtorId.toString()) {
        throw new Error("Only owners can assign tasks to other members");
      }
    }

    if (taskData.relations && taskData.relations.length > 0) {
      const lead = await Lead.findById(taskData.relations[0]);
      if (lead && lead.realtorId) {
        taskData.assigneeId = lead.realtorId.toString();
      }
    }

    const task = new Task(taskData);
    const savedTask = await task.save();

    // Log activity for each related lead
    if (taskData.relations && taskData.relations.length > 0) {
      for (const leadId of taskData.relations) {
        await ActivityService.logActivity({
          leadId: leadId.toString(),
          realtorId: taskData.realtorId.toString(),
          type: ActivityType.TASK_ADDED,
          content: `Added task: ${taskData.title}`
        });
      }
    }

    return savedTask;
  }

  static async getTasks(workspaceId: string, realtorId: string) {
    const membership = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    // Every member sees all tasks in the workspace
    const query: any = { workspaceId };

    return await Task.find(query)
      .populate("relations", "name email")
      .populate("realtorId", "name")
      .populate("assigneeId", "name")
      .sort({ createdAt: -1 })
      .lean();
  }
  static async getTasksByLead(leadId: string, workspaceId: string, realtorId: string) {
    const membership = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    const query: any = {
      workspaceId,
      relations: leadId,
    };

    return await Task.find(query)
      .populate("realtorId", "name")
      .populate("assigneeId", "name")
      .sort({ createdAt: -1 })
      .lean();
  }

  static async updateTask(realtorId: string, taskId: string, taskData: ITaskUpdate) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error("Task not found");

    const membership = await Membership.findOne({
      workspace: task.workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) throw new Error("You are not a member of this workspace");

    // Role check for update permissions
    if (membership.role !== "OWNER") {
      if (task.assigneeId?.toString() !== realtorId.toString()) {
        throw new Error("Agents can only update tasks assigned to them");
      }
    }

    // Role check for assignment
    if (membership.role !== "OWNER" && taskData.assigneeId) {
      if (taskData.assigneeId.toString() !== realtorId.toString()) {
        throw new Error("Only owners can assign tasks to other members");
      }
    }

    const updatedTask = await Task.findOneAndUpdate(
      { _id: taskId },
      taskData,
      { new: true, runValidators: true }
    ).lean();

    if (updatedTask && taskData.status === "Done") {
      // Log task completion for each related lead
      if (updatedTask.relations && updatedTask.relations.length > 0) {
        for (const leadId of updatedTask.relations) {
          await ActivityService.logActivity({
            leadId: leadId.toString(),
            realtorId: realtorId,
            type: ActivityType.TASK_COMPLETED,
            content: `Completed task: ${updatedTask.title}`
          });
        }
      }
    }

    return updatedTask;
  }

  static async deleteTask(realtorId: string, taskId: string) {
    const task = await Task.findById(taskId);
    if (!task) throw new Error("Task not found");

    const membership = await Membership.findOne({
      workspace: task.workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) throw new Error("You are not a member of this workspace");

    // Role check for delete permissions
    if (membership.role !== "OWNER") {
      if (task.assigneeId?.toString() !== realtorId.toString()) {
        throw new Error("Agents can only delete tasks assigned to them");
      }
    }

    return await Task.findOneAndDelete({ _id: taskId }).lean();
  }
}
