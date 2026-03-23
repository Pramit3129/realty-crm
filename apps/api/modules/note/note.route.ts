import { Router } from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";
import * as noteController from "./note.controller";

const router = Router();

router.use(requireAuth);
router.use(requirePro);

router.post("/create", noteController.createNote);
router.get("/workspace/:workspaceId", noteController.getNotes);
router.get("/lead/:leadId/workspace/:workspaceId", noteController.getNotesByLead);
router.put("/details/:id", noteController.updateNote);
router.delete("/details/:id", noteController.deleteNote);

export default router;
