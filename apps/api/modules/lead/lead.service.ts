import mongoose from "mongoose";
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
import { SMS_Service } from "../smsCampaign/services/sms.service";
import { Tag } from "../tag/tag.model";
import sift from "sift";

export class LeadService {
  static async createLead(leadData: ILeadCreate, hasSMSCampaignEnabled: boolean = false) {
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

    // Standardize data for high-performance case-insensitive searching
    if (leadData.email) leadData.email = leadData.email.toLowerCase();
    if (leadData.city) leadData.city = leadData.city.toLowerCase();
    if (leadData.source) leadData.source = leadData.source.toLowerCase();

    const lead = new Lead(leadData);
    const savedLead = await lead.save();

    await ActivityService.logActivity({
      leadId: savedLead._id.toString(),
      realtorId: leadData.realtorId as string,
      type: ActivityType.LEAD_CREATED,
      content: `Lead created: ${savedLead.name}`,
    });

    // Auto-assign default SMS drip campaign if user has it enabled
    if (hasSMSCampaignEnabled) {
      SMS_Service.assignCampaign(savedLead._id.toString(), 0, 'default').catch((err) => {
        console.error('[LeadService] Auto SMS campaign assignment failed:', err.message);
      });
    }

    return savedLead;
  }

  static async getLeads(workspaceId: string, realtorId: string, tagId?: string) {
    const membership = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }
    const roleInWorkspace = membership.role;
    
    let query: any = { workspaceId: new mongoose.Types.ObjectId(workspaceId) };
    if (roleInWorkspace !== "OWNER") {
      query.realtorId = new mongoose.Types.ObjectId(realtorId);
    }

    if (tagId) {
      const tag = await Tag.findOne({ 
        _id: new mongoose.Types.ObjectId(tagId), 
        workspaceId: new mongoose.Types.ObjectId(workspaceId) 
      }).lean();
      if (!tag) {
        throw new Error("Tag not found");
      }
      
      if (tag.type === "DYNAMIC") {
        query = { ...query, ...this.normalizeFilters(tag.filters) };
      } else {
        query.tags = new mongoose.Types.ObjectId(tagId);
      }
    }

    const leads = await Lead.find(query)
      .populate("stageId", "colorIndex name")
      .populate("realtorId", "name email")
      .populate("tags", "name color type")
      .lean();

    // virtual tag Logic
    const dynamicTags = await Tag.find({ workspaceId, type: "DYNAMIC" }).lean();
    const tagMatchers = dynamicTags.map(tag => ({
      tag,
      matches: sift(this.normalizeFiltersForSift(tag.filters))
    }));

    return leads.map(lead => {
      const flat = this.flattenLeadForSift(lead);
      const virtualTags = tagMatchers
        .filter(m => {
          try { return m.matches(flat); } catch { return false; }
        })
        .map(m => m.tag);

      return {
        ...lead,
        tags: [...(lead.tags || []), ...virtualTags]
      };
    });
  }

  static async getLeadDetails(realtorId: string, leadId: string) {
    const lead = await Lead.findById(leadId).lean();
    if (!lead) return null;

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

    if (!hasAccess) return null;

    const leadData = await Lead.findById(leadId)
      .populate("stageId", "colorIndex name")
      .populate("realtorId", "name email")
      .populate("tags", "name color type")
      .lean();

    if (!leadData) return null;

    // virtual tag (same as getLeads)
    const dynamicTags = await Tag.find({
      workspaceId: leadData.workspaceId,
      type: "DYNAMIC",
    }).lean();

    const flat = this.flattenLeadForSift(leadData);
    const virtualTags = dynamicTags
      .filter((tag) => {
        try {
          return sift(this.normalizeFiltersForSift(tag.filters))(flat);
        } catch (e) {
          return false;
        }
      })
    
    return {
      ...leadData,
      tags: [...(leadData.tags || []), ...virtualTags],
    };
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

  static async reassignOwner(
    callerId: string,
    leadId: string,
    newOwnerId: string,
  ) {
    const lead = await Lead.findById(leadId).lean();
    if (!lead) {
      throw new Error("Lead not found");
    }

    const callerMembership = await Membership.findOne({
      workspace: lead.workspaceId,
      user: callerId,
      isRemoved: false,
    });
    if (!callerMembership || callerMembership.role !== "OWNER") {
      throw new Error("Only workspace owners can reassign leads");
    }

    const newOwnerMembership = await Membership.findOne({
      workspace: lead.workspaceId,
      user: newOwnerId,
      isRemoved: false,
    });
    if (!newOwnerMembership) {
      throw new Error("New owner is not a member of this workspace");
    }

    if (lead.realtorId.toString() === newOwnerId) {
      return await Lead.findById(leadId)
        .populate("stageId", "colorIndex name")
        .populate("realtorId", "name email")
        .lean();
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { realtorId: newOwnerId },
      { new: true, runValidators: true },
    )
      .populate("stageId", "colorIndex name")
      .populate("realtorId", "name email")
      .lean();

    if (updatedLead) {
      const ownerName =
        (updatedLead.realtorId as any)?.name || newOwnerId;
      await ActivityService.logActivity({
        leadId,
        realtorId: callerId,
        type: ActivityType.LEAD_UPDATED,
        content: `Reassigned lead to ${ownerName}`,
      });
    }

    return updatedLead;
  }

  static async addLeads(
    leads: ILeadCreate[],
    realtorId: string,
    workspaceId: string,
    pipelineId?: string,
    campaignId?: string,
    hasSMSCampaignEnabled = false,
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
        email: lead.email?.toLowerCase(),
        city: lead.city?.toLowerCase(),
        source: lead.source?.toLowerCase(),
        realtorId: realtorId,
        workspaceId: workspaceId,
        pipelineId: assignedPipelineId,
        stageId: assignedStageId,
        status: assignedStatus || lead.status || "New Inquiry",
        campaignId: campaignId,
      } as any);
    }

    const insertedLeads = await Lead.insertMany(newLeads);

    // Auto-assign default SMS drip campaign to all new leads if user has it enabled
    if (hasSMSCampaignEnabled && insertedLeads.length > 0) {
      const leadIds = insertedLeads.map((l: any) => l._id.toString());
      SMS_Service.assignCampaigns(leadIds, 0, 'default').catch((err) => {
        console.error('[LeadService] Auto SMS campaign bulk assignment failed:', err.message);
      });
    }

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

  static async assignTagsToLeads(
    leadIds: string[],
    tagId: string,
    realtorId: string,
    workspaceId: string
  ) {
    const tag = await Tag.findOne({ _id: tagId, workspaceId }).lean();
    if (!tag) {
      throw new Error("Tag not found");
    }
    if (tag.type === "DYNAMIC") {
      throw new Error("Cannot manually assign dynamic tags to leads");
    }

    const membership = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    let query: any = { _id: { $in: leadIds }, workspaceId };
    if (membership.role !== "OWNER") {
      query.realtorId = realtorId;
    }

    return await Lead.updateMany(query, { $addToSet: { tags: tagId } });
  }

  static async removeTagsFromLeads(
    leadIds: string[],
    tagId: string,
    realtorId: string,
    workspaceId: string
  ) {
    const tag = await Tag.findOne({ _id: tagId, workspaceId }).lean();
    if (!tag) {
      throw new Error("Tag not found");
    }

    const membership = await Membership.findOne({
      workspace: workspaceId,
      user: realtorId,
      isRemoved: false,
    });
    if (!membership) {
      throw new Error("You are not a member of this workspace");
    }

    let query: any = { _id: { $in: leadIds }, workspaceId };
    if (membership.role !== "OWNER") {
      query.realtorId = realtorId;
    }

    return await Lead.updateMany(query, { $pull: { tags: tagId } });
  }

  // Sift runs in-memory on populated lead docs (realtorId is `{_id, name, email}`).
  // Flatten populated ObjectId refs to their hex string so equality matches a string filter.
  static flattenLeadForSift(lead: any): any {
    if (!lead) return lead;
    const out: any = { ...lead };
    const stringifyRef = (v: any): any => {
      if (!v) return v;
      if (v?._id) return v._id.toString();
      if (typeof v?.toString === "function" && v.constructor?.name === "ObjectId") return v.toString();
      return v;
    };
    if ("realtorId" in out) out.realtorId = stringifyRef(out.realtorId);
    if ("workspaceId" in out) out.workspaceId = stringifyRef(out.workspaceId);
    if ("stageId" in out) out.stageId = stringifyRef(out.stageId);
    if ("campaignId" in out) out.campaignId = stringifyRef(out.campaignId);
    return out;
  }

  // Sift can't compare an ObjectId instance to a hex string; keep ObjectId-keyed
  // filter values as plain strings here and rely on flattenLeadForSift on the lead side.
  static normalizeFiltersForSift(filters: any): any {
    if (!filters) return {};
    const OBJECT_ID_KEYS = new Set(["realtorId", "workspaceId", "_id", "campaignId", "stageId"]);
    const normalized: any = {};
    for (const key in filters) {
      const value = filters[key];
      if (["city", "email", "source"].includes(key)) {
        normalized[key] = typeof value === "string" ? value.toLowerCase() : value;
        continue;
      }
      if (OBJECT_ID_KEYS.has(key)) {
        // leave as plain string for string-vs-string equality in sift
        normalized[key] = value && typeof value === "object" && value._bsontype
          ? value.toString()
          : value;
        continue;
      }
      if (typeof value === "string") {
        normalized[key] = { $regex: `^${value}$`, $options: "i" };
      } else if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !Object.keys(value).some((k) => k.startsWith("$"))
      ) {
        normalized[key] = this.normalizeFiltersForSift(value);
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  static normalizeFilters(filters: any): any {
    if (!filters) return {};
    const normalized: any = {};

    const OBJECT_ID_KEYS = new Set(["realtorId", "workspaceId", "_id", "campaignId"]);
    const isObjectIdHex = (v: any) =>
      typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

    for (const key in filters) {
      const value = filters[key];

      if (["city", "email", "source"].includes(key)) {
        normalized[key] = typeof value === "string" ? value.toLowerCase() : value;
        continue;
      }

      // ObjectId-typed fields: skip regex (regex never matches ObjectId-typed columns).
      // Cast hex strings to ObjectId so Mongo can match the stored ObjectId directly.
      if (OBJECT_ID_KEYS.has(key) || isObjectIdHex(value)) {
        if (isObjectIdHex(value)) {
          normalized[key] = new mongoose.Types.ObjectId(value);
        } else {
          normalized[key] = value;
        }
        continue;
      }

      if (typeof value === "string") {
        normalized[key] = { $regex: `^${value}$`, $options: "i" };
      }
      else if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        !Object.keys(value).some(k => k.startsWith('$'))
      ) {
        normalized[key] = this.normalizeFilters(value);
      }
      else {
        normalized[key] = value;
      }
    }
    return normalized;
  }
}
