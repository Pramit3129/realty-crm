import express from "express";
import { runScheduler } from "./scheduler.controller";

const router = express.Router();

router.post("/run", runScheduler);

export default router;