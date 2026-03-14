import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import scenesRouter from "./scenes";
import shotsRouter from "./shots";
import assetsRouter from "./assets";
import directorRouter from "./director";
import generationJobsRouter from "./generation-jobs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(scenesRouter);
router.use(shotsRouter);
router.use(assetsRouter);
router.use(directorRouter);
router.use(generationJobsRouter);

export default router;
