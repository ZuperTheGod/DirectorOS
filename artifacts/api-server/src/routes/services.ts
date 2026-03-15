import { Router, type IRouter } from "express";
import { checkAllServices } from "../services/connectors";
import { getConfig } from "../config/ai-services";

const router: IRouter = Router();

router.get("/services/status", async (_req, res): Promise<void> => {
  const statuses = await checkAllServices();
  const config = await getConfig();
  res.json({
    services: statuses,
    config: {
      lmstudio: { url: config.lmstudio.url, model: config.lmstudio.model },
      comfyui: { url: config.comfyui.url },
      wan2gp: { url: config.wan2gp.url },
      ffmpeg: { path: config.ffmpeg.path },
    },
  });
});

router.post("/services/test/:serviceName", async (req, res): Promise<void> => {
  const { serviceName } = req.params;
  const statuses = await checkAllServices();
  const service = statuses.find(s => s.name.toLowerCase().replace(/\s+/g, "") === serviceName.toLowerCase().replace(/\s+/g, ""));

  if (!service) {
    res.status(404).json({ error: `Unknown service: ${serviceName}` });
    return;
  }

  res.json(service);
});

export default router;
