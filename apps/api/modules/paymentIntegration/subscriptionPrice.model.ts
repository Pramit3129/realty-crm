import mongoose from 'mongoose';

const subscriptionPriceSchema = new mongoose.Schema({
     priceId: {type: String, required: true, unique: true, index: true},
     price: {type: Number, required: true},
     currency: {type: String, required: true},
     subscriptionId: {type: mongoose.Schema.Types.ObjectId, ref: "Subscription", index: true},
}, { timestamps: true });

export const SubscriptionPrice = mongoose.model("SubscriptionPrice", subscriptionPriceSchema);