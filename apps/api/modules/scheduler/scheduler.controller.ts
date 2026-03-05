import type { Request, Response } from "express";
import { SchedulerService } from "./scheduler.service";

export const runScheduler = async (req: Request, res: Response) => {

  if (req.headers["x-internal-header"] !== process.env.INTERNAL_SECRET) {
    return res.status(401).json({ success: false });
  }

  try {

    await SchedulerService.run();

    res.json({ success: true });

  } catch (error) {

    console.error(error);

    res.status(500).json({ success: false });

  }

};