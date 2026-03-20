import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import { workspaceService } from "./workspace.service";
import { membershipService } from "../memberships/memberships.service";
import { createWorkspaceSchema } from "./workspace.types";
import { pipelineStageService } from "../pipelineStage/pipelineStage.service";
import { PipelineService } from "../pipeline/pipeline.service";
import { Workspace } from "./workspace.model";

const pipelineService = new PipelineService();

export const createWorkspace = async (req: Request, res: Response) => {
    try {
        const { name, domain } = createWorkspaceSchema.parse(req.body);
        const authUser = req as AuthenticatedRequest;
        const workspace = await workspaceService.createWorkspace(name, authUser.user.id, domain);
        await membershipService.createMembership(
            String(workspace._id),
            authUser.user.id,
            "OWNER"
        );

        // --- BUILT-IN DEFAULT PIPELINES ---
        const buyerPipeline = await pipelineService.createPipeline("Buyer", "BUYER", String(workspace._id), authUser.user.id);
        const buyerStages = [
            { name: "New Inquiry", probability: 10, isFinal: false, colorIndex: 0 },
            { name: "Contacted", probability: 20, isFinal: false, colorIndex: 1 },
            { name: "Qualified", probability: 40, isFinal: false, colorIndex: 2 },
            { name: "Active Search", probability: 60, isFinal: false, colorIndex: 3 },
            { name: "Showing Scheduled", probability: 70, isFinal: false, colorIndex: 4 },
            { name: "Offer Preparing", probability: 80, isFinal: false, colorIndex: 5 },
            { name: "Offer Submitted", probability: 90, isFinal: false, colorIndex: 6 },
            { name: "Under Contract", probability: 95, isFinal: false, colorIndex: 7 },
            { name: "Closed Won", probability: 100, isFinal: true, colorIndex: 8 },
            { name: "Lost", probability: 0, isFinal: true, colorIndex: 9 },
        ];

        for (let i = 0; i < buyerStages.length; i++) {
            const stage = buyerStages[i];
            if (!stage) continue;
            await pipelineStageService.createStage({
                name: stage.name,
                pipelineId: String(buyerPipeline?._id),
                workspaceId: String(workspace._id),
                stageNumber: i + 1,
                probability: stage.probability,
                isFinal: stage.isFinal,
                colorIndex: stage.colorIndex,
            });
        }

        const sellerPipeline = await pipelineService.createPipeline("Seller", "SELLER", String(workspace._id), authUser.user.id);
        const sellerStages = [
            { name: "New Inquiry", probability: 10, isFinal: false, colorIndex: 0 },
            { name: "Consultation Scheduled", probability: 30, isFinal: false, colorIndex: 1 },
            { name: "Listing Agreement Signed", probability: 50, isFinal: false, colorIndex: 2 },
            { name: "Property Live", probability: 70, isFinal: false, colorIndex: 3 },
            { name: "Offer Received", probability: 85, isFinal: false, colorIndex: 4 },
            { name: "Under Contract", probability: 95, isFinal: false, colorIndex: 7 },
            { name: "Closed Won", probability: 100, isFinal: true, colorIndex: 8 },
            { name: "Lost", probability: 0, isFinal: true, colorIndex: 9 },
        ];

        for (let i = 0; i < sellerStages.length; i++) {
            const stage = sellerStages[i];
            if (!stage) continue;
            await pipelineStageService.createStage({
                name: stage.name,
                pipelineId: String(sellerPipeline?._id),
                workspaceId: String(workspace._id),
                stageNumber: i + 1,
                probability: stage.probability,
                isFinal: stage.isFinal,
                colorIndex: stage.colorIndex,
            });
        }
        const trackerScript = `
            <script 
            src="${process.env.BACKEND_URL || 'http://localhost:3000'}/tracker.js"
            data-key="${workspace.apiKey}" 
            defer>
            </script>
        `.trim();
        res.status(201).json({ workspace, trackerScript });
    } catch (error) {
        res.status(500).json({ message: "Failed to create workspace" });
    }
};

export const getWorkspace = async (req: Request, res: Response) => {
    try {
        const authUser = req as AuthenticatedRequest;
        const workspaces = await workspaceService.getWorkspacesForUser(authUser.user.id);
        res.status(200).json(workspaces);
    } catch (error) {
        res.status(500).json({ message: "Failed to get workspaces" });
    }
};

export const updateWorkspace = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, domain } = req.body;
        const authUser = req as AuthenticatedRequest;

        // Check if workspace exists and user is owner
        const workspace = await Workspace.findOne({ _id: id, owner: authUser.user.id });
        if (!workspace) {
            return res.status(404).json({ message: "Workspace not found or unauthorized" });
        }

        const updatedWorkspace = await workspaceService.updateWorkspace(id, { name, domain });
        res.status(200).json(updatedWorkspace);
    } catch (error) {
        res.status(500).json({ message: "Failed to update workspace" });
    }
};