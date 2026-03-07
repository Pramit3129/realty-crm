import type { Request, Response } from "express";
import { addMembersSchema, updateMemberSchema } from "./memberships.types";
import { membershipService } from "./memberships.service";
import { generateInviteToken, verifyInviteToken } from "../../shared/utils/token";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { Workspace } from "../workspace/workspace.model";
import { ensureDefaultPipelines } from "../pipeline/pipeline.seed";

// ── POST /memberships/add-members ────────────────────────────────────
export const addMembers = async (req: Request, res: Response) => {
    try {
        const { workspaceId, users } = addMembersSchema.parse(req.body);
        const memberships = await membershipService.createManyMemberships(workspaceId, users);
        res.status(201).json({ message: "Members added successfully", memberships });
    } catch (error) {
        res.status(500).json({ message: "Failed to add members" });
    }
};

// ── GET /memberships/workspace/:workspaceId ──────────────────────────
export const getMembers = async (req: Request, res: Response) => {
    try {
        const workspaceId = req.params.workspaceId as string;
        const members = await membershipService.getMembersByWorkspace(workspaceId);
        res.status(200).json(members);
    } catch (error) {
        res.status(500).json({ message: "Failed to get members" });
    }
};

// ── GET /memberships/:id ─────────────────────────────────────────────
export const getMember = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const membership = await membershipService.getMembershipById(id);
        if (!membership) {
            res.status(404).json({ message: "Membership not found" });
            return;
        }
        res.status(200).json(membership);
    } catch (error) {
        res.status(500).json({ message: "Failed to get membership" });
    }
};

// ── PATCH /memberships/:id ───────────────────────────────────────────
export const updateMember = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const data = updateMemberSchema.parse(req.body);
        const membership = await membershipService.updateMembership(id, data);
        if (!membership) {
            res.status(404).json({ message: "Membership not found" });
            return;
        }
        res.status(200).json(membership);
    } catch (error) {
        res.status(500).json({ message: "Failed to update membership" });
    }
};

// ── DELETE /memberships/:id ──────────────────────────────────────────
export const removeMember = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const membership = await membershipService.removeMembership(id);
        if (!membership) {
            res.status(404).json({ message: "Membership not found" });
            return;
        }
        res.status(200).json({ message: "Member removed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to remove member" });
    }
};

// ── GET /memberships/invite/:workspaceId ──────────────────────────────
export const generateInviteLink = async (req: Request, res: Response) => {
    try {
        const workspaceId = req.params.workspaceId as string;
        // Verify the user is the OWNER before generating invite (optional but recommended)
        const authUser = req as AuthenticatedRequest;
        const memberships = await membershipService.getMembersByWorkspace(workspaceId);
        const isOwner = memberships.some(m => m.user._id.toString() === authUser.user.id && m.role === "OWNER");
        
        if (!isOwner) {
            res.status(403).json({ message: "Only workspace owners can generate invite links" });
            return;
        }

        const token = generateInviteToken(workspaceId);
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: "Failed to generate invite link" });
    }
};

// ── POST /memberships/join/:token ────────────────────────────────────
export const joinWorkspace = async (req: Request, res: Response) => {
    try {
        const token = req.params.token as string;
        const payload = verifyInviteToken(token);
        if (!payload || !payload.workspaceId) {
            res.status(400).json({ message: "Invalid or expired invite token" });
            return;
        }

        const authUser = req as AuthenticatedRequest;
        const workspaceId = payload.workspaceId;

        // Check if user is already a member
        const existingMemberships = await membershipService.getMembersByWorkspace(workspaceId);
        const isMember = existingMemberships.some(m => m.user._id.toString() === authUser.user.id);
        
        if (isMember) {
            // They are already a member, just return success
            res.status(200).json({ message: "Already a member", workspaceId });
            return;
        }

        // Add them as AGENT
        await membershipService.createMembership(workspaceId, authUser.user.id, "AGENT");

        // Proactively create default pipelines for the new member
        await ensureDefaultPipelines(workspaceId, authUser.user.id);

        // Upgrade Workspace to TEAM if it was SOLO
        const workspace = await Workspace.findById(workspaceId);
        if (workspace && workspace.type === "SOLO") {
            workspace.type = "TEAM";
            await workspace.save();
        }

        res.status(200).json({ message: "Successfully joined workspace", workspaceId });
    } catch (error) {
        res.status(500).json({ message: "Failed to join workspace" });
    }
};
