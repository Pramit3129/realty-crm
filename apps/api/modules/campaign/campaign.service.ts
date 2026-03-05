import { Campaing } from "./models/campaign.model";
import { CampaignStep } from "./models/campaignStep.model";
import type { ICampaignCreate, ICampaignUpdate, ICampaignStepCreate } from "./campaign.types";

export class CampaingService {
  static async createCampaing(data: ICampaignCreate) {
    const campaing = await Campaing.create({
      name: data.name,
      description: data.description,
      workspaceId: data.workspaceId,
      userId: data.userId,
    });
    return campaing;
  }

  static async updateCampaing(updateData: ICampaignUpdate, userId: string) {
    const campaing = await Campaing.findOneAndUpdate(
      { _id: updateData.campaignId, userId },
      {
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
      },
      { new: true },
    ).lean();
    return campaing;
  }

  static async deleteCampaing(campaingId: string, userId: string) {
    const campaing = await Campaing.findOneAndDelete({
      _id: campaingId,
      userId,
    }).lean();
    return campaing;
  }

  static async getCampaing(campaingId: string, userId: string) {
    const campaing = await Campaing.findOne({ _id: campaingId, userId }).lean();
    return campaing;
  }

  static async getCampaings(workspaceId: string, userId: string) {
    const campaings = await Campaing.find({ workspaceId, userId })
      .sort({ createdAt: -1 })
      .lean();
    return campaings;
  }

  static async createCampaignStep(data: ICampaignStepCreate) {
    const campaignStep = await CampaignStep.create({
      campaignId: data.campaignId,
      subject: data.subject,
      body: data.body,
      delayDays: data.delayDays,
      stepOrder: data.stepOrder,
    });
    await campaignStep.save();
    return campaignStep;
  }
}
