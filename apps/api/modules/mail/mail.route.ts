import express from "express";
import { generateMail, getAllTemplates, getTemplate } from "./mail.controller";
import requireAuth from "../../shared/middleware/requireAuth";

const router = express.Router();

router.get("/health", (req, res) => {
    res.send("Mail Route running properly");
});

router.use(requireAuth);

router.post("/generateMail", generateMail);
router.get("/templates", getAllTemplates);
router.post("/template", getTemplate);
// router.post("/sendMail", sendMail);

export default router;