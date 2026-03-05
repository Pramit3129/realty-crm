import type { Request, Response } from "express";
import { MailService } from "./mail.service";
import { Templates } from "./templates";


export const generateMail = async (req: Request, res: Response) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({
                success: false,
                message: "Topic is required",
            })
        }
        const mail = await MailService.generateMail(topic);
        return res.status(200).json({
            success: true,
            message: "Mail generated successfully",
            data: mail
        })
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate mail",
        })
    }
}

export const getAllTemplates = async (req: Request, res: Response) => {
    try {
        const templates = Templates.getAllTemplates();
        return res.status(200).json({
            success: true,
            message: "All templates fetched successfully",
            data: templates
        })
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch templates",
        })
    }
}

export const getTemplate = async (req: Request, res: Response) => {
    try {
        const { type, subject, body } = req.body;
        if (!type) {
            return res.status(400).json({
                success: false,
                message: "Template type is required",
            })
        }
        const template = Templates.getTemplate(type, subject, body);
        return res.status(200).json({
            success: true,
            message: "Template fetched successfully",
            data: template
        })
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch template",
        })
    }
}

// NOTE: in mails wherever the realtor wants the lead name in email body, use {{name}}
// export const sendMail = async (req: Request, res: Response) => {
//     try {
//         const realtorId = (req as AuthenticatedRequest).user.id;
//         const { leads, mail, delay } = req.body;
//         if (!leads || !mail) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Leads, mail and realtorId are required",
//             })
//         }
//         if (leads.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Leads are required",
//             })
//         }
//         const realtorObjectId = new mongoose.Types.ObjectId(realtorId);

//         if (leads.length > 50) {
//             const batchSize = 50;
//             const promises = [];
//             for (let i = 0; i < leads.length; i += batchSize) {
//                 const batch = leads.slice(i, i + batchSize);
//                 promises.push(MailService.queueMail(batch, mail, realtorObjectId, delay ? delay : 0));
//             }
//             const results = await Promise.all(promises);
//             return res.status(200).json({
//                 success: true,
//                 message: `Mail queued for sending successfully in ${results.length} batches`,
//                 data: results,
//             });
//         }

//         const result = await MailService.queueMail(leads, mail, realtorObjectId, delay);
//         return res.status(200).json({
//             success: true,
//             message: "Mail queued for sending successfully",
//             data: result,
//         })
//     } catch (error: any) {
//         console.error(error);
//         return res.status(500).json({
//             success: false,
//             message: error.message || "Failed to send mail",
//         })
//     }
// }