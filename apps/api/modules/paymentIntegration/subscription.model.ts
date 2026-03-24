import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
        planName: {type: String, required: true},
        planId: {type: String, required: true, unique: true, index: true},
}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

export const FREE_PLAN = {
    planName: "free",
    planId: "free_plan",
};
