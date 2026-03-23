import { Router } from "express";
import { getLeadCommunications } from "./communication.controller";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";

const router = Router();

router.use(requireAuth);
router.use(requirePro);

router.get("/lead/:leadId", getLeadCommunications as any);

export default router;
