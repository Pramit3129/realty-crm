import { Router } from "express";
import { getLeadActivities } from "./activity.controller";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";

const router = Router();

router.use(requireAuth);
router.use(requirePro);

router.get("/lead/:leadId", getLeadActivities as any);

export default router;
