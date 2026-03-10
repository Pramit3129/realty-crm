import { Schema, model, Document, Types } from "mongoose";

export interface IEmailIntegration extends Document {
    userId: Types.ObjectId;
    email: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const emailIntegrationSchema = new Schema<IEmailIntegration>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        accessToken: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
        },
        expiresAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

export const EmailIntegration = model<IEmailIntegration>("EmailIntegration", emailIntegrationSchema);
