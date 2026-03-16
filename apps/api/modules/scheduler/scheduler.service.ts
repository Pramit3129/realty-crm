import mongoose from "mongoose";
import { CampaignBatch } from "../campaign/models/campaignBatch.model";
import { Campaing } from "../campaign/models/campaign.model";
import { MailService } from "../mail/mail.service";

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const LOOKAHEAD_MS = 5 * 60 * 1000;

export interface SchedulerStats {
  queued: number;
  paused: number;
  pages: number;
  durationMs: number;
}

export class SchedulerService {

  static async run(signal?: AbortSignal): Promise<SchedulerStats> {

    const start = Date.now();
    const windowEnd = new Date(Date.now() + LOOKAHEAD_MS);

    let totalQueued = 0;
    let totalPaused = 0;

    const campaignIdsWithPending: mongoose.Types.ObjectId[] =
      await CampaignBatch.distinct("campaignId", {
        status: "pending",
        runAt: { $lte: windowEnd },
      });

    if (campaignIdsWithPending.length === 0) {
      return { queued: 0, paused: 0, pages: 0, durationMs: Date.now() - start };
    }

    const runningCampaigns = await Campaing.find({
      _id: { $in: campaignIdsWithPending },
      status: "running",
    })
      .select("_id")
      .lean();

    const runningIds = new Set(
      runningCampaigns.map((c) => c._id.toString()),
    );

    const staleIds = campaignIdsWithPending.filter(
      (id) => !runningIds.has(id.toString()),
    );

    if (staleIds.length > 0) {
      const pauseResult = await CampaignBatch.updateMany(
        {
          campaignId: { $in: staleIds },
          status: "pending",
        },
        { $set: { status: "paused" } },
      );
      totalPaused = pauseResult.modifiedCount;
    }

    if (runningIds.size === 0) {
      return { queued: 0, paused: totalPaused, pages: 0, durationMs: Date.now() - start };
    }

    const runningIdArray = [...runningIds].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    let page = 0;

    for (; page < MAX_PAGES; page++) {

      if (signal?.aborted) break;

      const batches = await CampaignBatch.find({
        status: "pending",
        runAt: { $lte: windowEnd },
        campaignId: { $in: runningIdArray },
      })
        .sort({ runAt: 1 })
        .limit(PAGE_SIZE)
        .select("_id")
        .lean();

      if (batches.length === 0) break;

      const batchIds = batches.map((b) => b._id);

      await CampaignBatch.updateMany(
        { _id: { $in: batchIds }, status: "pending" },
        { $set: { status: "queued" } },
      );

      for (const id of batchIds) {
        await MailService.queueMail(id);
      }

      totalQueued += batchIds.length;

      if (batches.length < PAGE_SIZE) break;
    }

    const stats: SchedulerStats = {
      queued: totalQueued,
      paused: totalPaused,
      pages: page + 1,
      durationMs: Date.now() - start,
    };

    console.log(
      `[scheduler] tick complete — queued=${stats.queued} paused=${stats.paused} pages=${stats.pages} duration=${stats.durationMs}ms`,
    );

    return stats;
  }
}