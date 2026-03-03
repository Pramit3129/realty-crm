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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate mail",
            error: error
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch templates",
            error: error
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
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch template",
            error: error
        })
    }
}


export const sendMail = async (req: Request, res: Response) => {
    res.send("Mail sent successfully");
}