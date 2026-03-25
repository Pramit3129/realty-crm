import { EmailTemplate } from "./emailTemplate.model";

const MAX_TEMPLATES = 3;

export interface IBlock {
  id: string;
  type: string;
  props: Record<string, any>;
}

export interface IEmailTemplateCreate {
  name: string;
  userId: string;
  workspaceId: string;
  blocks: IBlock[];
  backgroundColor?: string;
}

export class EmailTemplateService {
  static async getTemplates(workspaceId: string, userId: string) {
    return EmailTemplate.find({ workspaceId, userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  static async createTemplate(data: IEmailTemplateCreate) {
    const count = await EmailTemplate.countDocuments({
      workspaceId: data.workspaceId,
      userId: data.userId,
    });
    if (count >= MAX_TEMPLATES) {
      throw new Error(`You can only save up to ${MAX_TEMPLATES} templates. Please delete an existing template to create a new one.`);
    }
    return EmailTemplate.create({
      name: data.name,
      userId: data.userId,
      workspaceId: data.workspaceId,
      blocks: data.blocks,
      backgroundColor: data.backgroundColor ?? "#ffffff",
    });
  }

  static async updateTemplate(
    templateId: string,
    userId: string,
    name: string,
    blocks: IBlock[],
    backgroundColor: string
  ) {
    return EmailTemplate.findOneAndUpdate(
      { _id: templateId, userId },
      { name, blocks, backgroundColor },
      { new: true }
    ).lean();
  }

  static async deleteTemplate(templateId: string, userId: string) {
    return EmailTemplate.findOneAndDelete({ _id: templateId, userId }).lean();
  }
}
