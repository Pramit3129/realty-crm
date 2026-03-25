import mongoose from "mongoose";

const templateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {
    type: String,
    required: true
  },
  design: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  html: {
    type: String,
    required: true
  }
}, { timestamps: true });

export const Template = mongoose.model("Template", templateSchema);
