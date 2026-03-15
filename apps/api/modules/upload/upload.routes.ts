import { Router } from "express";
import multer from "multer";
import requireAuth from "../../shared/middleware/requireAuth";
import { uploadImage } from "./upload.controller";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/image", requireAuth, upload.single("file"), uploadImage);

export default router;
