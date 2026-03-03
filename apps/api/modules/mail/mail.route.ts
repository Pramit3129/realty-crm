import express from "express";
import { generateMail } from "./mail.controller";
import requireAuth from "../../shared/middleware/requireAuth";

const router = express.Router();
router.use(requireAuth);
router.get("/health", (req, res) => {
    res.send("Mail Route running properly");
});

router.post("/generateMail", generateMail)

export default router;