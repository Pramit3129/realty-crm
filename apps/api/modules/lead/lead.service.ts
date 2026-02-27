import { Lead } from "./lead.model";
import type { ILeadCreate, IleadOverView, ILeadUpdate } from "./lead.types";
import { Membership } from "../memberships/memberships.model";


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
            const leadDetails: IleadOverView[] = await Lead.find({ workspaceId })
                .select("name email phone _id")
                .lean();
            return leadDetails;
        }
        const leadDetails: IleadOverView[] = await Lead.find({ workspaceId, realtorId })
            .select("name email phone _id")
            .lean();
        return leadDetails;
    }

    static async getLeadDetails(realtorId: string, leadId: string) {
        return await Lead.findOne({ realtorId, _id: leadId }).lean();
    }

    static async updateLead(realtorId: string, leadId: string, leadData: ILeadUpdate) {
        return await Lead.findOneAndUpdate(
            { realtorId, _id: leadId },
            leadData,
            { new: true, runValidators: true }
        );
    }

    static async deleteLead(realtorId: string, leadId: string) {
        return await Lead.findOneAndDelete({ realtorId, _id: leadId });
    }

    static async addLeads(leads: ILeadCreate[], realtorId: string, workspaceId: string) {
        const checkWorkspace = await Membership.findOne({
            workspace: workspaceId,
            user: realtorId,
            isRemoved: false,
        });
        if (!checkWorkspace) {
            throw new Error("You are not a member of this workspace");
        }
        const newLeads: ILeadCreate[] = leads.map((lead) => ({
            ...lead,
            realtorId: realtorId,
            workspaceId: workspaceId,
        }));
        const insertedLeads = await Lead.insertMany(newLeads);
        return insertedLeads;
    }

}