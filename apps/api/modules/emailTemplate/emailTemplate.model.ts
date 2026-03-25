import mongoose from "mongoose";

const emailBlockSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["heading", "text", "image", "button", "divider", "spacer"],
    },
    props: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const emailTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
    blocks: { type: [emailBlockSchema], default: [] },
    backgroundColor: { type: String, default: "#ffffff" },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ workspaceId: 1, userId: 1 });

export const EmailTemplate = mongoose.model("EmailTemplate", emailTemplateSchema);
