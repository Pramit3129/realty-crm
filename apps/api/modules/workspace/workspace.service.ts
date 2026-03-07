import { Workspace } from "./workspace.model";
import { Membership } from "../memberships/memberships.model";

class WorkspaceService {
    async createWorkspace(name: string, userId: string) {
        const workspace = await Workspace.create({ name, type: "SOLO", owner: userId });
        return workspace;
    }

    async getWorkspacesForUser(userId: string) {
        const memberships = await Membership.find({ user: userId, isRemoved: false })
            .populate("workspace")
            .sort({ createdAt: 1 })
            .lean();
        
        return memberships
            .filter((m) => m.workspace)
            .map((m) => ({
                ...(m.workspace as any),
                role: m.role,
                membershipId: m._id,
            }));
    }
}

export const workspaceService = new WorkspaceService();