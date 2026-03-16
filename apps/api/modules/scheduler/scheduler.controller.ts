import type { Request, Response } from "express";
import { SchedulerService } from "./scheduler.service";

const TICK_TIMEOUT_MS = 4 * 60 * 1000;

export const runScheduler = async (req: Request, res: Response) => {

  if (process.env.NODE_ENV !== 'development' && req.headers["x-internal-header"] !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ success: false });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TICK_TIMEOUT_MS);

  try {

    const stats = await SchedulerService.run(controller.signal);

    clearTimeout(timer);

    res.json({ success: true, ...stats });

  } catch (error) {

    clearTimeout(timer);
    console.error("[scheduler] tick failed:", error);

    res.status(500).json({ success: false });

  }

};