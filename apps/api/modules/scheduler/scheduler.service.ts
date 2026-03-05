import { CampaignBatch } from "../campaign/models/campaignBatch.model";
import { MailService } from "../mail/mail.service";

export class SchedulerService {

  static async run(): Promise<void> {

    const windowEnd = new Date(Date.now() + 5 * 60 * 1000);

    while (true) {

      const batch = await CampaignBatch.findOneAndUpdate(
        {
          status: "pending",
          runAt: { $lte: windowEnd }
        },
        {
          $set: { status: "queued" }
        },
        {
          sort: { runAt: 1 },
          new: true
        }
      );

      if (!batch) break;

      await MailService.queueMail(batch._id);

    }

  }

}