import { Router } from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import * as taskController from "./task.controller";

const router = Router();

router.use(requireAuth);

router.post("/create", taskController.createTask);
router.get("/workspace/:workspaceId", taskController.getTasks);
router.get("/lead/:leadId/workspace/:workspaceId", taskController.getTasksByLead);
router.put("/details/:id", taskController.updateTask);
router.delete("/details/:id", taskController.deleteTask);

export default router;
