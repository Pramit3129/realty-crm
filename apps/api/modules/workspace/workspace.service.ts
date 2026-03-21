import { Workspace } from "./workspace.model";
import { Membership } from "../memberships/memberships.model";
import { trackerService } from "../trackers/tracker.service";
import { ApiKey } from "../trackers/key.model";

class WorkspaceService {
    async createWorkspace(name: string, userId: string, domain?: string) {
        const workspace = await Workspace.create({ name, type: "SOLO", owner: userId });
        await trackerService.generateApiKey(String(workspace._id), userId, domain);
        return workspace;
    }

    async updateWorkspace(workspaceId: string, data: { name?: string; domain?: string }, userId: string) {
        const { domain, ...otherData } = data;
        const workspace = await Workspace.findOneAndUpdate(
            { _id: workspaceId, owner: userId }, 
            { $set: otherData }, 
            { new: true }
        );
        
        if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");

        return workspace;
    }

    async getWorkspacesForUser(userId: string) {
        const memberships = await Membership.find({ user: userId, isRemoved: false })
            .populate("workspace")
            .sort({ createdAt: 1 })
            .lean();
        
        const workspaceData = await Promise.all(memberships
            .filter((m) => m.workspace)
            .map(async (m) => {
                const keyDoc = await ApiKey.findOne({ user: userId, workspace: (m.workspace as any)._id }).select("domain");
                return {
                    ...(m.workspace as any),
                    role: m.role,
                    membershipId: m._id,
                    domain: keyDoc?.domain || null
                };
            }));

        return workspaceData;
    }
}

export const workspaceService = new WorkspaceService();