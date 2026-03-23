import mongoose from 'mongoose';

const subscriptionPriceSchema = new mongoose.Schema({
     priceId: {type: String, required: true},
     price: {type: Number, required: true},
     currency: {type: String, required: true},
     interval: {type: String, required: true},
     intervalCount: {type: Number, required: true},
     subscriptionId: {type: mongoose.Schema.Types.ObjectId, ref: "Subscription"},
}, { timestamps: true });

export const SubscriptionPrice = mongoose.model("SubscriptionPrice", subscriptionPriceSchema);