import { WorkerService } from "./worker.service";
import type { Request, Response } from "express";

export const sendMail = async (req: Request, res: Response) => {
    try {
        if (req.headers['x-internal-header'] !== process.env.INTERNAL_SECRET) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            })
        }
        const { mailId } = req.body;
        if (!mailId) {
            return res.status(400).json({
                success: false,
                message: "mailId is required",
            })
        }
        await WorkerService.sendBatchEmailWithRetry(mailId);
        return res.status(200).json({
            success: true,
            message: "Mail sent successfully",
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to send mail",
            error: error
        })
    }
}