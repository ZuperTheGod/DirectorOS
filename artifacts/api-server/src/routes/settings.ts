import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { getConfig, upsertSetting, invalidateCache } from "../config/ai-services";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const config = await getConfig();
  res.json({
    lmstudio: {
      url: config.lmstudio.url,
      model: config.lmstudio.model || "",
    },
    comfyui: {
      url: config.comfyui.url,
    },
    wan2gp: {
      url: config.wan2gp.url,
    },
    ffmpeg: {
      path: config.ffmpeg.path,
    },
    openai: {
      url: config.openai.url,
      apiKey: config.openai.apiKey ? "••••••••" + config.openai.apiKey.slice(-4) : "",
      model: config.openai.model,
    },
  });
});

const ALLOWED_FIELDS: Record<string, string[]> = {
  lmstudio: ["url", "model"],
  comfyui: ["url"],
  wan2gp: ["url"],
  ffmpeg: ["path"],
  openai: ["url", "apiKey", "model"],
};

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidFfmpegPath(str: string): boolean {
  return /^[a-zA-Z0-9_\-./\\]+$/.test(str) && str.length < 256;
}

function validateField(category: string, key: string, value: string): string | null {
  if (typeof value !== "string" || value.length > 512) return "Invalid value";
  if (key === "url" && value.length > 0 && !isValidUrl(value)) return `Invalid URL for ${category}.${key}`;
  if (category === "ffmpeg" && key === "path" && value.length > 0 && !isValidFfmpegPath(value)) return `Invalid path for ffmpeg`;
  if (key === "apiKey") return null;
  if (key === "model") return null;
  return null;
}

router.put("/settings", async (req, res): Promise<void> => {
  const body = req.body;
  const updates: Array<{ category: string; key: string; value: string }> = [];
  const errors: string[] = [];

  for (const [category, allowedKeys] of Object.entries(ALLOWED_FIELDS)) {
    const section = body[category];
    if (!section || typeof section !== "object") continue;
    for (const key of allowedKeys) {
      if (section[key] === undefined) continue;
      const value = String(section[key]);
      if (key === "apiKey" && (!value || value.trim() === "")) continue;
      const err = validateField(category, key, value);
      if (err) {
        errors.push(err);
      } else {
        updates.push({ category, key, value });
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join("; ") });
    return;
  }

  for (const update of updates) {
    await upsertSetting(update.category, update.key, update.value);
  }

  invalidateCache();
  const config = await getConfig();

  res.json({
    success: true,
    config: {
      lmstudio: { url: config.lmstudio.url, model: config.lmstudio.model },
      comfyui: { url: config.comfyui.url },
      wan2gp: { url: config.wan2gp.url },
      ffmpeg: { path: config.ffmpeg.path },
      openai: {
        url: config.openai.url,
        apiKey: config.openai.apiKey ? "••••••••" + config.openai.apiKey.slice(-4) : "",
        model: config.openai.model,
      },
    },
  });
});

export default router;
