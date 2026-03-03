import type { Request, Response } from "express";
import { CampaingService } from "./campaing.service";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import type { ICampaignCreate, ICampaignUpdate } from "./campaing.types";


export const createCampaing = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const { name, description, workspaceId } = authReq.body;
        if (!name || !description || !workspaceId) {
            return res.status(400).json({
                success: false,
                message: "Name, description and status are required",
            })
        }
        const campaingCreateData: ICampaignCreate = {
            name,
            description,
            workspaceId,
            userId
        }

        const campaing = await CampaingService.createCampaing(campaingCreateData);
        return res.status(200).json({
            success: true,
            message: "Campaing created successfully",
            data: campaing
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to create campaing",
            error: error
        })
    }
}

export const updateCampaing = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const { name, description, status, campaignId } = req.body;
        if (!name || !description || !status || !campaignId) {
            return res.status(400).json({
                success: false,
                message: "Name, description and status are required",
            })
        }
        const campaingUpdateData: ICampaignUpdate = {
            campaignId,
            name,
            description,
            status,
        }
        const updatedCampaing = await CampaingService.updateCampaing(campaingUpdateData, userId);
        return res.status(200).json({
            success: true,
            message: "Campaing updated successfully",
            data: updatedCampaing
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update campaing",
            error: error
        })
    }
}

export const getCampaings = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const workspaceId = req.params.workspaceId as string;
        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                message: "WorkspaceId is required",
            })
        }
        const campaings = await CampaingService.getCampaings(workspaceId, userId);
        return res.status(200).json({
            success: true,
            message: "Campaings fetched successfully",
            data: campaings
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch campaings",
            error: error
        })
    }
}

export const getCampaingDetails = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const campaignId = req.params.campaignId as string;
        if (!campaignId) {
            return res.status(400).json({
                success: false,
                message: "CampaignId is required",
            })
        }
        const campaing = await CampaingService.getCampaing(campaignId, userId);
        return res.status(200).json({
            success: true,
            message: "Campaing details fetched successfully",
            data: campaing
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch campaing details",
            error: error
        })
    }
}

export const deleteCampaing = async (req: Request, res: Response) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const userId = authReq.user.id;
        const campaignId = req.params.campaignId as string;
        if (!campaignId) {
            return res.status(400).json({
                success: false,
                message: "CampaignId is required",
            })
        }
        const campaing = await CampaingService.deleteCampaing(campaignId, userId);
        return res.status(200).json({
            success: true,
            message: "Campaing deleted successfully",
            data: campaing
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete campaing",
            error: error
        })
    }
}