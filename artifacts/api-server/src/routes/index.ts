import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import scenesRouter from "./scenes";
import shotsRouter from "./shots";
import assetsRouter from "./assets";
import directorRouter from "./director";
import generationJobsRouter from "./generation-jobs";
import generateImageRouter from "./generate-image";
import generateVideoRouter from "./generate-video";
import exportRouter from "./export";
import servicesRouter from "./services";
import clipsRouter from "./clips";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(scenesRouter);
router.use(shotsRouter);
router.use(assetsRouter);
router.use(directorRouter);
router.use(generationJobsRouter);
router.use(generateImageRouter);
router.use(generateVideoRouter);
router.use(exportRouter);
router.use(servicesRouter);
router.use(clipsRouter);
router.use(settingsRouter);

export default router;
