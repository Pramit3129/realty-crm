import { Router } from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";
import { createWorkspace, getWorkspace, updateWorkspace } from "./workspace.controller";

const router = Router();

router.use(requireAuth);
router.use(requirePro);

router.post("/create", createWorkspace);
router.get("/", getWorkspace);
router.put("/:id", updateWorkspace);

export default router;