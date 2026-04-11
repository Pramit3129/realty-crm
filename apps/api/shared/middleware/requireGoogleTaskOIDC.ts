import type { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export default async function requireGoogleTaskOIDC(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send("Unauthorized: Missing or invalid Authorization header");
    }

    const token = authHeader.split(" ")[1];
    if(!token) {
        return res.status(401).send("Unauthorized: Token missing");
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
        });

        const payload = ticket.getPayload();
        
        // Ensure that the token is issued by the expected service account
        // You must have GCP_SERVICE_ACCOUNT_EMAIL set in your .env
        const expectedServiceAccount = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
        
        if (expectedServiceAccount && payload?.email !== expectedServiceAccount) {
            return res.status(403).send("Forbidden: Invalid service account email");
        }

        next();
    } catch (error) {
        console.error("GCP Task OIDC Auth Error:", error);
        return res.status(401).send("Unauthorized");
    }
}
