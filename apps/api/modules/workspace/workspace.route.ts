import { Router } from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import { createWorkspace, getWorkspace, updateWorkspace } from "./workspace.controller";

const router = Router();

router.post("/create", requireAuth, createWorkspace);
router.get("/", requireAuth, getWorkspace);
router.put("/:id", requireAuth, updateWorkspace);

export default router;