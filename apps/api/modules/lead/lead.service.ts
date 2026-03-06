import { Lead } from "./lead.model";
import type { ILeadCreate, IleadOverView, ILeadUpdate } from "./lead.types";
import { Membership } from "../memberships/memberships.model";
import { ensureDefaultPipelines } from "../pipeline/pipeline.seed";
import { PipelineStage } from "../pipelineStage/pipelineStage.model";


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
                leadData.realtorId as string
            );
            const pipelineType = leadData.type === "SELLER" ? "seller" : "buyer";
            leadData.pipelineId = defaults[pipelineType].pipelineId;
            if (!leadData.stageId) {
                leadData.stageId = defaults[pipelineType].firstStageId;
            }
        } else if (!leadData.stageId) {
            const firstStage = await PipelineStage.findOne({ pipelineId: leadData.pipelineId }).sort({ stageNumber: 1 });
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
        return await lead.save();
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
                .lean();
        }
        return await Lead.find({ workspaceId, realtorId })
            .populate("stageId", "colorIndex name")
            .lean();
    }

    static async getLeadDetails(realtorId: string, leadId: string) {
        return await Lead.findOne({ realtorId, _id: leadId })
            .populate("stageId", "colorIndex name")
            .lean();
    }

    static async updateLead(realtorId: string, leadId: string, leadData: ILeadUpdate) {
        if (leadData.pipelineId) {
            const currentLead = await Lead.findOne({ realtorId, _id: leadId }).lean();
            if (currentLead && currentLead.pipelineId?.toString() !== leadData.pipelineId.toString()) {
                const firstStage = await PipelineStage.findOne({ pipelineId: leadData.pipelineId }).sort({ stageNumber: 1 });
                if (firstStage) {
                    leadData.stageId = firstStage._id;
                }
            }
        }

        return await Lead.findOneAndUpdate(
            { realtorId, _id: leadId },
            leadData,
            { new: true, runValidators: true }
        ).populate("stageId", "colorIndex name").lean();
    }

    static async deleteLead(realtorId: string, leadId: string) {
        return await Lead.findOneAndDelete({ realtorId, _id: leadId }).lean();
    }

    static async addLeads(leads: ILeadCreate[], realtorId: string, workspaceId: string, pipelineId?: string, campaignId?: string) {
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
                const firstStage = await PipelineStage.findOne({ pipelineId: assignedPipelineId }).sort({ stageNumber: 1 });
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

    static async assignCampaingToLeads(leads: string[], campaignId: string, userId: string, workspaceId: string) {
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
            { $set: { campaignId } }
        );
        return updatedLeads;
    }

    static async getLeadsByCampaing(campaignId: string, userId: string, workspaceId: string) {
        const checkWorkspace = await Membership.findOne({
            workspace: workspaceId,
            user: userId,
            isRemoved: false,
        });
        if (!checkWorkspace) {
            throw new Error("You are not a member of this workspace");
        }
        const leads = await Lead.find({ campaignId, realtorId: userId, workspaceId }).lean();
        return leads;
    }
}