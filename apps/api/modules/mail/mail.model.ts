import mongoose from "mongoose";

const mailSchema = new mongoose.Schema({
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    realtorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending"
    },
    leads: {
        type: [{
            leadId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Lead",
                required: true
            },
            leadName: {
                type: String,
                required: true
            },
            mailId: {
                type: String,
                required: true
            }
        }],
        required: true
    }
}, { timestamps: true })

const Mail = mongoose.model("Mail", mailSchema);

export default Mail;