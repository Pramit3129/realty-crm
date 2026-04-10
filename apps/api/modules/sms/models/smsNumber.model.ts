import mongoose from "mongoose";

const SMSNumberSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    number: { type: String, unique: true },
    accountSid: { type: String, required: true },
    status: { type: String, default: 'active' }
});

export const SMSNumber = mongoose.model('SMSNumber', SMSNumberSchema);
