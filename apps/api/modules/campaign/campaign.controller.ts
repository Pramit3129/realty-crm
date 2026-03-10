import type { Request, Response } from "express";
import { CampaingService } from "./campaign.service";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";
import type { ICampaignCreate, ICampaignUpdate, ICampaignStepCreate, ILead } from "./campaign.types";
import { CampaignBatch } from "./models/campaignBatch.model";

export const createCampaing = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { name, description, workspaceId } = authReq.body;
    if (!name || !description || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Name, description and status are required",
      });
    }
    const campaingCreateData: ICampaignCreate = {
      name,
      description,
      workspaceId,
      userId,
    };

    const campaing = await CampaingService.createCampaing(campaingCreateData);
    return res.status(200).json({
      success: true,
      message: "Campaing created successfully",
      data: campaing,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create campaign",
    });
  }
};

export const updateCampaing = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { name, description, status, campaignId } = req.body;
    if (!name || !description || !status || !campaignId) {
      return res.status(400).json({
        success: false,
        message: "Name, description and status are required",
      });
    }
    const campaingUpdateData: ICampaignUpdate = {
      campaignId,
      name,
      description,
      status,
    };
    const updatedCampaing = await CampaingService.updateCampaing(
      campaingUpdateData,
      userId,
    );
    return res.status(200).json({
      success: true,
      message: "Campaing updated successfully",
      data: updatedCampaing,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update campaign",
    });
  }
};

export const getCampaings = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const workspaceId = req.params.workspaceId as string;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "WorkspaceId is required",
      });
    }
    const campaings = await CampaingService.getCampaings(workspaceId, userId);
    return res.status(200).json({
      success: true,
      message: "Campaings fetched successfully",
      data: campaings,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch campaigns",
    });
  }
};

export const getCampaingDetails = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const campaignId = req.params.campaignId as string;
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: "CampaignId is required",
      });
    }
    const campaing = await CampaingService.getCampaing(campaignId, userId);
    return res.status(200).json({
      success: true,
      message: "Campaing details fetched successfully",
      data: campaing,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch campaign details",
    });
  }
};

export const deleteCampaing = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const campaignId = req.params.campaignId as string;
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: "CampaignId is required",
      });
    }
    const campaing = await CampaingService.deleteCampaing(campaignId, userId);
    return res.status(200).json({
      success: true,
      message: "Campaing deleted successfully",
      data: campaing,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete campaign",
    });
  }
};

export const createCampaignStep = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { campaignId, subject, body, delayDays, stepOrder } = req.body;
    if (!campaignId || !subject || !body || delayDays == null || stepOrder == null) {
      return res.status(400).json({
        success: false,
        message: "CampaignId, subject, body, delayDays and stepOrder are required",
      });
    }
    const campaignStepCreateData: ICampaignStepCreate = {
      campaignId,
      subject,
      body,
      delayDays,
      stepOrder,
    };
    const campaignStep = await CampaingService.createCampaignStep(campaignStepCreateData);
    return res.status(200).json({
      success: true,
      message: "Campaign step created successfully",
      data: campaignStep,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create campaign step",
    });
  }
};

export const startCampaign = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { campaignId, leads } = req.body;
    if (!campaignId || !leads) {
      return res.status(400).json({
        success: false,
        message: "CampaignId and leads are required",
      });
    }

    const leadDetails: ILead[] = leads.map((lead: any) => {
      return {
        leadId: lead.leadId,
        email: lead.email,
        name: lead.name
      }
    })
    const campaing = await CampaingService.startCampaign(campaignId, leadDetails);
    return res.status(200).json({
      success: true,
      message: "Campaing started successfully",
      data: campaing,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start campaign",
    });
  }
}

export const deleteCampaignStep = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const stepId = req.params.stepId as string;
    if (!stepId) {
      return res.status(400).json({
        success: false,
        message: "stepId is required",
      });
    }
    const campaing = await CampaingService.deleteCampaignStep(stepId);
    return res.status(200).json({
      success: true,
      message: "Campaing step deleted successfully",
      data: campaing,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete campaign",
    });
  }
};

export const getCampaignSteps = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const campaignId = req.params.campaignId as string;
    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: "CampaignId is required",
      });
    }
    const steps = await CampaingService.getCampaignSteps(campaignId);
    return res.status(200).json({
      success: true,
      message: "Campaign steps fetched successfully",
      data: steps,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch campaign steps",
    });
  }
}

export const updateCampaignStep = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const stepId = req.params.stepId as string;
    const { subject, body, delayDays } = req.body;
    if (!stepId || !subject || !body || delayDays == null) {
      return res.status(400).json({
        success: false,
        message: "stepId, subject, body and delayDays are required",
      });
    }
    const step = await CampaingService.updateCampaignStep(stepId, subject, body, delayDays);
    return res.status(200).json({
      success: true,
      message: "Campaign step updated successfully",
      data: step,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update campaign step",
    });
  }

};

export const trackEmailOpen = async (req: Request, res: Response) => {
  try {
    const { batchId, leadId } = req.params;

    if (!batchId || !leadId) {
      return res.status(400).send("Missing parameters");
    }

    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

    res.writeHead(200, {
      "Content-Type": "image/gif",
      "Content-Length": pixel.length,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    res.end(pixel);

    CampaignBatch.findOneAndUpdate(
      {
        _id: batchId,
        "leads.leadId": leadId,
        "leads.openedAt": { $exists: false }
      },
      {
        $set: { "leads.$.openedAt": new Date() }
      }
    ).catch(console.error);

  } catch (error) {
    console.error("Error in email tracking pixel:", error);
    const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    res.writeHead(200, { "Content-Type": "image/gif" });
    res.end(pixel);
  }
};
