import { Lead } from "./lead.model";
import type { ILeadCreate, IleadOverView, ILeadUpdate } from "./lead.types";
import { Membership } from "../memberships/memberships.model";
import { ensureDefaultPipelines } from "../pipeline/pipeline.seed";
import { PipelineStage } from "../pipelineStage/pipelineStage.model";
import { CampaignBatch } from "../campaign/models/campaignBatch.model";
import { ActivityService } from "../activity/activity.service";
import { ActivityType } from "../activity/activity.types";
import { EmailHistory } from "../emailIntegration/emailHistory.model";
import { Communication } from "../communication/communication.model";

export class LeadService {
  static async createLead(leadData: ILeadCreate) {
    const checkWorkspace = await Membership.findOne({
      workspace: leadData.workspaceId,
      user: leadData.realtorId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }

    // Auto-assign pipeline and stage if not provided
    if (!leadData.pipelineId) {
      const defaults = await ensureDefaultPipelines(
        leadData.workspaceId as string,
        leadData.realtorId as string,
      );
      const pipelineType = leadData.type === "SELLER" ? "seller" : "buyer";
      leadData.pipelineId = defaults[pipelineType].pipelineId;
      if (!leadData.stageId) {
        leadData.stageId = defaults[pipelineType].firstStageId;
      }
    } else if (!leadData.stageId) {
      const firstStage = await PipelineStage.findOne({
        pipelineId: leadData.pipelineId,
      }).sort({ stageNumber: 1 });
      if (firstStage) {
        leadData.stageId = firstStage._id.toString();
      }
    }

    // Sync status with stage name if not explicitly provided
    if (leadData.stageId && !leadData.status) {
      const stage = await PipelineStage.findById(leadData.stageId);
      if (stage) {
        leadData.status = stage.name;
      }
    }

    const lead = new Lead(leadData);
    const savedLead = await lead.save();

    await ActivityService.logActivity({
      leadId: savedLead._id.toString(),
      realtorId: leadData.realtorId as string,
      type: ActivityType.LEAD_CREATED,
      content: `Lead created: ${savedLead.name}`,
    });

    return savedLead;
  }

  static async getLeads(workspaceId: string, realtorId: string) {
    const membership = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }
    const roleInWorkspace = membership.role;
    if (roleInWorkspace === "OWNER") {
      return await Lead.find({ workspaceId })
        .populate("stageId", "colorIndex name")
        .populate("realtorId", "name email")
        .lean();
    }
    return await Lead.find({ workspaceId, realtorId })
      .populate("stageId", "colorIndex name")
      .populate("realtorId", "name email")
      .lean();
  }

  static async getLeadDetails(realtorId: string, leadId: string) {
    const lead = await Lead.findById(leadId).lean();
    if (!lead) return null;

    if (lead.realtorId.toString() === realtorId) {
      return await Lead.findById(leadId)
        .populate("stageId", "colorIndex name")
        .populate("realtorId", "name email")
        .lean();
    }

    const membership = await Membership.findOne({
      workspace: lead.workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (membership?.role === "OWNER") {
      return await Lead.findById(leadId)
        .populate("stageId", "colorIndex name")
        .populate("realtorId", "name email")
        .lean();
    }

    return null;
  }

  static async getLeadEmails(realtorId: string, leadId: string) {
    const lead = await Lead.findById(leadId).lean();
    if (!lead) {
      throw new Error("Lead not found");
    }

    let hasAccess = false;
    if (lead.realtorId.toString() === realtorId) {
      hasAccess = true;
    } else {
      const membership = await Membership.findOne({
        workspace: lead.workspaceId,
        user: realtorId,
        isRemoved: false,
      });
      if (membership?.role === "OWNER") {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new Error("Unauthorized access to lead emails");
    }

    const [emails, communications] = await Promise.all([
      EmailHistory.find({ leadId }).sort({ receivedAt: -1 }).lean(),
      Communication.find({ leadId, type: "EMAIL" }).sort({ sentAt: -1 }).lean(),
    ]);

    const emailHistoryWithSource = emails.map((e) => ({
      ...e,
      source: "incoming" as const,
      timestamp: e.receivedAt,
    }));

    const communicationsWithSource = communications.map((c) => ({
      _id: c._id,
      leadId: c.leadId,
      realtorId: c.realtorId,
      subject: c.subject,
      body: c.body,
      senderEmail: c.senderEmail || null,
      messageId: null,
      receivedAt: c.sentAt,
      source: "outgoing" as const,
      timestamp: c.sentAt,
    }));

    const allEmails = [
      ...emailHistoryWithSource,
      ...communicationsWithSource,
    ].sort(
      (a, b) =>
        new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime(),
    );

    return allEmails;
  }

  static async getAllEmails(realtorId: string) {
    const [emails, communications] = await Promise.all([
      EmailHistory.find({ realtorId })
        .populate("leadId", "name email")
        .sort({ receivedAt: -1 })
        .limit(50)
        .lean(),
      Communication.find({ realtorId, type: "EMAIL" })
        .populate("leadId", "name email")
        .sort({ sentAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const emailHistoryWithSource = emails.map((e) => ({
      ...e,
      source: "incoming" as const,
      timestamp: e.receivedAt,
    }));

    const communicationsWithSource = communications.map((c) => ({
      _id: c._id,
      leadId: c.leadId,
      realtorId: c.realtorId,
      subject: c.subject,
      body: c.body,
      senderEmail: c.senderEmail || null,
      messageId: null,
      receivedAt: c.sentAt,
      source: "outgoing" as const,
      timestamp: c.sentAt,
    }));

    const allEmails = [...emailHistoryWithSource, ...communicationsWithSource]
      .sort(
        (a, b) =>
          new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime(),
      )
      .slice(0, 50);

    return allEmails;
  }

  static async updateLead(
    realtorId: string,
    leadId: string,
    leadData: ILeadUpdate,
  ) {
    if (leadData.pipelineId) {
      const currentLead = await Lead.findOne({ realtorId, _id: leadId }).lean();
      if (
        currentLead &&
        currentLead.pipelineId?.toString() !== leadData.pipelineId.toString()
      ) {
        const firstStage = await PipelineStage.findOne({
          pipelineId: leadData.pipelineId,
        }).sort({ stageNumber: 1 });
        if (firstStage) {
          leadData.stageId = firstStage._id;
        }
      }
    }

    const updatedLead = await Lead.findOneAndUpdate(
      { realtorId, _id: leadId },
      leadData,
      { new: true, runValidators: true },
    )
      .populate("stageId", "colorIndex name")
      .lean();

    if (updatedLead) {
      // Log update activity
      const changes: string[] = [];
      if (leadData.name) changes.push(`name to ${leadData.name}`);
      if (leadData.email) changes.push(`email to ${leadData.email}`);
      if (leadData.phone) changes.push(`phone to ${leadData.phone}`);
      if (leadData.status) changes.push(`status to ${leadData.status}`);

      if (changes.length > 0) {
        await ActivityService.logActivity({
          leadId: leadId,
          realtorId: realtorId,
          type: ActivityType.LEAD_UPDATED,
          content: `Updated ${changes.join(", ")}`,
        });
      }
    }

    return updatedLead;
  }

  static async deleteLead(realtorId: string, leadId: string) {
    return await Lead.findOneAndDelete({ realtorId, _id: leadId }).lean();
  }

  static async addLeads(
    leads: ILeadCreate[],
    realtorId: string,
    workspaceId: string,
    pipelineId?: string,
    campaignId?: string,
  ) {
    const checkWorkspace = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }

    // Auto-assign pipeline if not provided
    let defaultPipelineId = pipelineId;
    let defaultStageId: string | undefined;
    if (!defaultPipelineId) {
      const defaults = await ensureDefaultPipelines(workspaceId, realtorId);
      defaultPipelineId = defaults.buyer.pipelineId?.toString();
      defaultStageId = defaults.buyer.firstStageId?.toString();
    }

    const newLeads: ILeadCreate[] = [];
    for (const lead of leads) {
      let assignedPipelineId = lead.pipelineId || defaultPipelineId;
      let assignedStageId = lead.stageId || defaultStageId;

      if (assignedPipelineId && !assignedStageId) {
        const firstStage = await PipelineStage.findOne({
          pipelineId: assignedPipelineId,
        }).sort({ stageNumber: 1 });
        if (firstStage) {
          assignedStageId = firstStage._id.toString();
        }
      }

      let assignedStatus = lead.status;
      if (assignedStageId && !assignedStatus) {
        const stage = await PipelineStage.findById(assignedStageId);
        if (stage) {
          assignedStatus = stage.name;
        }
      }

      newLeads.push({
        ...lead,
        realtorId: realtorId,
        workspaceId: workspaceId,
        pipelineId: assignedPipelineId,
        stageId: assignedStageId,
        status: assignedStatus || lead.status || "New Inquiry",
        campaignId: campaignId,
      } as any);
    }

    const insertedLeads = await Lead.insertMany(newLeads);
    return insertedLeads;
  }

  static async assignCampaingToLeads(
    leads: string[],
    campaignId: string,
    userId: string,
    workspaceId: string,
  ) {
    const checkWorkspace = await Membership.findOne({
      workspace: workspaceId,
      user: userId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }
    const updatedLeads = await Lead.updateMany(
      { _id: { $in: leads }, realtorId: userId, workspaceId },
      { $set: { campaignId } },
    );
    return updatedLeads;
  }

  static async getLeadsByCampaing(
    campaignId: string,
    userId: string,
    workspaceId: string,
  ) {
    const checkWorkspace = await Membership.findOne({
      workspace: workspaceId,
      user: userId,
      isRemoved: false,
    });
    if (!checkWorkspace) {
      throw new Error("You are not a member of this workspace");
    }
    const leads = await Lead.find({
      campaignId,
      realtorId: userId,
      workspaceId,
    }).lean();

    const batches = await CampaignBatch.find({ campaignId }).lean();

    const leadsWithTracking = leads.map((lead) => {
      let totalEmailsSent = 0;
      let totalEmailsOpened = 0;
      let totalOpenCount = 0;
      let lastOpenedAt: Date | null = null;
      let stepsOpened: { stepId: string; openedAt: Date; openCount: number }[] =
        [];

      batches.forEach((batch) => {
        if (batch.status === "sent" || batch.status === "processing") {
          const leadInBatch = batch.leads?.find(
            (l: any) => l.leadId.toString() === lead._id.toString(),
          );
          if (leadInBatch) {
            totalEmailsSent++;
            if (leadInBatch.openedAt) {
              totalEmailsOpened++;
              totalOpenCount += leadInBatch.openCount || 1;
              stepsOpened.push({
                stepId: batch.stepId!.toString(),
                openedAt: leadInBatch.openedAt,
                openCount: leadInBatch.openCount || 1,
              });
              if (
                !lastOpenedAt ||
                new Date(leadInBatch.openedAt) > new Date(lastOpenedAt)
              ) {
                lastOpenedAt = leadInBatch.openedAt;
              }
            }
          }
        }
      });

      return {
        ...lead,
        tracking: {
          totalEmailsSent,
          totalEmailsOpened,
          totalOpenCount,
          hasOpenedAny: totalEmailsOpened > 0,
          lastOpenedAt,
          stepsOpened,
        },
      };
    });

    return leadsWithTracking;
  }
}
