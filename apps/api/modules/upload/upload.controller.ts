import { cloudinary } from "../../shared/config/cloudinary";
import type { Request, Response } from "express";

export async function uploadImage(req: Request, res: Response): Promise<void> {
    try {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        // Upload to Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        
        const result = await cloudinary.uploader.upload(dataURI, {
            resource_type: "auto",
            folder: "realty-crm/onboarding",
        });

        res.status(200).json({
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        res.status(500).json({ message: "Upload failed" });
    }
}
