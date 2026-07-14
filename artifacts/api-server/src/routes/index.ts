import { Router } from "express";
import healthRouter from "./health.js";
import scoresRouter from "./scores.js";
import statsRouter from "./stats.js";

const router = Router();

router.use("/healthz", healthRouter);
router.use("/scores", scoresRouter);
router.use("/stats", statsRouter);

export default router;
