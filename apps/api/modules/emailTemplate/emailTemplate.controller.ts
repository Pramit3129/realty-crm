import type { Request, Response } from "express";
import { EmailTemplateService } from "./emailTemplate.service";
import type { AuthenticatedRequest } from "../../shared/middleware/requireAuth";

const PREBUILT_TEMPLATES = [
  {
    _id: "prebuilt-welcome",
    name: "Welcome Email",
    isPrebuilt: true,
    backgroundColor: "#f4f4f7",
    blocks: [
      {
        id: "p1-h1",
        type: "heading",
        props: { text: "Welcome, {{name}}!", level: 1, align: "center", color: "#1a1a2e" },
      },
      {
        id: "p1-div1",
        type: "divider",
        props: { color: "#208ef0" },
      },
      {
        id: "p1-t1",
        type: "text",
        props: {
          text: "Thank you for connecting with us. We're thrilled to have you on board and look forward to helping you find your perfect property.",
          align: "left",
          color: "#444444",
        },
      },
      {
        id: "p1-t2",
        type: "text",
        props: {
          text: "Our team is ready to assist you every step of the way — from browsing listings to closing the deal. Don't hesitate to reach out with any questions.",
          align: "left",
          color: "#444444",
        },
      },
      {
        id: "p1-sp1",
        type: "spacer",
        props: { height: 20 },
      },
      {
        id: "p1-btn1",
        type: "button",
        props: {
          text: "Explore Listings",
          url: "#",
          bgColor: "#208ef0",
          textColor: "#ffffff",
          align: "center",
        },
      },
      {
        id: "p1-sp2",
        type: "spacer",
        props: { height: 20 },
      },
      {
        id: "p1-footer",
        type: "text",
        props: {
          text: "You received this email because you are subscribed to our campaign. To unsubscribe, click the link below.",
          align: "center",
          color: "#aaaaaa",
        },
      },
    ],
  },
  {
    _id: "prebuilt-property",
    name: "Property Showcase",
    isPrebuilt: true,
    backgroundColor: "#ffffff",
    blocks: [
      {
        id: "p2-h1",
        type: "heading",
        props: { text: "Hi {{name}}, We Found a Match!", level: 1, align: "center", color: "#1a1a2e" },
      },
      {
        id: "p2-t1",
        type: "text",
        props: {
          text: "Based on your preferences, we've handpicked a property that we think you'll love. Take a look at the details below.",
          align: "center",
          color: "#555555",
        },
      },
      {
        id: "p2-div1",
        type: "divider",
        props: { color: "#eeeeee" },
      },
      {
        id: "p2-img1",
        type: "image",
        props: {
          url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80",
          alt: "Featured Property",
          align: "center",
        },
      },
      {
        id: "p2-h2",
        type: "heading",
        props: { text: "3 BHK Luxury Apartment", level: 2, align: "left", color: "#1a1a2e" },
      },
      {
        id: "p2-t2",
        type: "text",
        props: {
          text: "📍 Downtown District  •  🛏 3 Beds  •  🚿 2 Baths  •  📐 1,850 sq ft\n\nThis stunning property features modern finishes, floor-to-ceiling windows, and breathtaking city views. Priced to sell — don't miss out!",
          align: "left",
          color: "#444444",
        },
      },
      {
        id: "p2-sp1",
        type: "spacer",
        props: { height: 16 },
      },
      {
        id: "p2-btn1",
        type: "button",
        props: {
          text: "Schedule a Viewing",
          url: "#",
          bgColor: "#208ef0",
          textColor: "#ffffff",
          align: "center",
        },
      },
      {
        id: "p2-sp2",
        type: "spacer",
        props: { height: 20 },
      },
      {
        id: "p2-footer",
        type: "text",
        props: {
          text: "You are receiving this because you opted in to our property alerts. To unsubscribe, click here.",
          align: "center",
          color: "#aaaaaa",
        },
      },
    ],
  },
];

export const getPrebuiltTemplates = (_req: Request, res: Response) => {
  return res.status(200).json({ success: true, data: PREBUILT_TEMPLATES });
};

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { workspaceId } = req.params;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId is required" });
    }
    const templates = await EmailTemplateService.getTemplates(workspaceId, userId);
    return res.status(200).json({ success: true, data: templates });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch templates" });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { name, workspaceId, blocks, backgroundColor } = req.body;
    if (!name || !workspaceId || !blocks) {
      return res.status(400).json({ success: false, message: "name, workspaceId and blocks are required" });
    }
    const template = await EmailTemplateService.createTemplate({
      name,
      userId,
      workspaceId,
      blocks,
      backgroundColor,
    });
    return res.status(200).json({ success: true, message: "Template created successfully", data: template });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || "Failed to create template" });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { templateId } = req.params;
    const { name, blocks, backgroundColor } = req.body;
    if (!templateId || !name || !blocks) {
      return res.status(400).json({ success: false, message: "templateId, name and blocks are required" });
    }
    const template = await EmailTemplateService.updateTemplate(
      templateId,
      userId,
      name,
      blocks,
      backgroundColor ?? "#ffffff"
    );
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }
    return res.status(200).json({ success: true, message: "Template updated successfully", data: template });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to update template" });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { templateId } = req.params;
    if (!templateId) {
      return res.status(400).json({ success: false, message: "templateId is required" });
    }
    await EmailTemplateService.deleteTemplate(templateId, userId);
    return res.status(200).json({ success: true, message: "Template deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || "Failed to delete template" });
  }
};
