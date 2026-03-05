import { Campaing } from "./campaign.model";
import type { ICampaignCreate, ICampaignUpdate } from "./campaign.types";

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
}
