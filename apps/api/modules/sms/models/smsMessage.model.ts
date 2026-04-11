import mongoose from "mongoose";

const SMSMessageSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    body: { type: String },
    fromNumber: { type: String },
    sid: { type: String, required: true, unique: true },
    deliveryStatus: { type: String, default: null },
    errorCode: { type: String, default: null }
}, { timestamps: true });

export const SMSMessage = mongoose.model('SMSMessage', SMSMessageSchema);
