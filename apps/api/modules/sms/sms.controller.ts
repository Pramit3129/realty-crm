import { SMS_Service } from "./sms.service";
import type { Request, Response } from "express";
import { Lead } from "../lead/lead.model";
import type { AuthenticatedRequest, AuthenticatedUser } from "../../shared/middleware/requireAuth";



// export const sendSMS = async (req: Request, res: Response) => {
//     const { leadId, campaignId, stepIndex } = req.body;
//     const lead = await Lead.findById(leadId).populate('userId'); // userId contains Twilio number
//     const campaign = await Campaign.findById(campaignId);

//     // 1. SAFETY CHECK (Crucial!)
//     if (!lead.isSubscribed || lead.status === 'CONVERTED') {
//         return res.status(200).send("Lead no longer eligible.");
//     }

//     // 2. SEND SMS
//     await twilio.messages.create({
//         body: campaign.steps[stepIndex].message,
//         from: lead.userId.assignedNumber,
//         to: lead.phoneNumber
//     });

//     // 3. CYCLE: Schedule the next step automatically
//     const nextIndex = stepIndex + 1;
//     if (campaign.steps[nextIndex]) {
//         await moveLeadToNextStep(leadId, campaignId, nextIndex);
//     } else {
//         await Lead.findByIdAndUpdate(leadId, { status: 'COMPLETED' });
//     }

//     res.status(200).send("SMS Sent and next step routed.");
// }


export async function onboardUser(req: Request, res: Response) {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user as AuthenticatedUser;
    const { country, areaCode } = req.body;
    if (!country || !areaCode) {
        return res.status(400).json({
            success: false,
            message: "Country and area code are required",
        });
    }
    await SMS_Service.onboardUser(user, country, areaCode);
    res.status(200).send("User onboarded successfully");
}

export async function assignCampaing(req: Request, res: Response){
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user as AuthenticatedUser;

    const lead = await Lead.findOne({_id: req.body.leadId, userId: user._id}).select("_id");
    if(!lead){
        return res.status(404).json({message: "Lead not found or not assigned to you"});
    }
    const {campaignId} = req.body;  
    
    if(!campaignId){
        return res.status(400).json({message: "Campaign ID is required"});
    }

    const assignedStatus = await SMS_Service.assignCampaign(lead._id.toString(), 0, campaignId);
    
    res.status(200).send({message: "Campaign assigned successfully", assignedStatus});
}