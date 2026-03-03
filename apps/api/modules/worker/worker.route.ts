import express from 'express'

const router = express.Router();

router.get("/health", (req, res) => {
    res.send("Worker Route running properly");
});


export default router;

