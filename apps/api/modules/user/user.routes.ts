import { Router } from "express";
import requireAuth from "../../shared/middleware/requireAuth";
import requireRole from "../../shared/middleware/requireRole";
import { getMe, getAllUsers, updateOnboarding, updateMe, deleteMe } from "./user.controller";

const router = Router();

// GET /user/me — current user profile
router.get("/me", requireAuth, getMe);

// PUT /user/me — update current user profile
router.put("/me", requireAuth, updateMe);

// DELETE /user/me — delete current user account
router.delete("/me", requireAuth, deleteMe);

// GET /user/admin/users — admin-only: list all users
router.get("/admin/users", requireAuth, requireRole("ADMIN"), getAllUsers);

// PUT /user/onboarding — update onboarding data
router.put("/onboarding", requireAuth, updateOnboarding);

export default router;
