import { Router } from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import requirePro from "../../shared/middleware/requirePro";
import {
    addMembers,
    getMembers,
    getMember,
    updateMember,
    removeMember,
    generateInviteLink,
    joinWorkspace,
} from "./memberships.controller";

const router = Router();

router.use(requireAuth);
router.use(requirePro);

router.post("/add-members", addMembers);
router.get("/workspace/:workspaceId", getMembers);
router.get("/invite/:workspaceId", generateInviteLink);
router.post("/join/:token", joinWorkspace);
router.get("/:id", getMember);
router.patch("/:id", updateMember);
router.delete("/:id", removeMember);

export default router;
