import { db, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface ServiceConfig {
  url: string;
  enabled: boolean;
  name: string;
  model?: string;
}

export interface OpenAIConfig {
  url: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  name: string;
}

export interface AIServicesConfig {
  llmProvider: string;
  lmstudio: ServiceConfig;
  comfyui: ServiceConfig;
  wan2gp: ServiceConfig;
  ffmpeg: { enabled: boolean; name: string; path: string };
  openai: OpenAIConfig;
}

const defaults: AIServicesConfig = {
  llmProvider: process.env.LLM_PROVIDER || "auto",
  lmstudio: {
    url: process.env.LMSTUDIO_URL || "http://localhost:1234",
    enabled: true,
    name: "LM Studio",
    model: process.env.LMSTUDIO_MODEL || "",
  },
  comfyui: {
    url: process.env.COMFYUI_URL || "http://localhost:8188",
    enabled: true,
    name: "ComfyUI",
  },
  wan2gp: {
    url: process.env.WAN2GP_URL || "http://localhost:7860",
    enabled: true,
    name: "Wan2GP",
  },
  ffmpeg: {
    enabled: true,
    name: "FFmpeg",
    path: process.env.FFMPEG_PATH || "ffmpeg",
  },
  openai: {
    url: process.env.OPENAI_BASE_URL || "https://api.openai.com",
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    enabled: true,
    name: "ChatGPT / OpenAI",
  },
};

let cachedConfig: AIServicesConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10000;

export async function getConfig(): Promise<AIServicesConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const rows = await db.select().from(settingsTable);
    const cfg = structuredClone(defaults);

    for (const row of rows) {
      if (row.category === "general") {
        if (row.key === "llmProvider" && row.value) cfg.llmProvider = row.value;
      } else if (row.category === "lmstudio") {
        if (row.key === "url" && row.value) cfg.lmstudio.url = row.value;
        if (row.key === "model" && row.value) cfg.lmstudio.model = row.value;
      } else if (row.category === "comfyui") {
        if (row.key === "url" && row.value) cfg.comfyui.url = row.value;
      } else if (row.category === "wan2gp") {
        if (row.key === "url" && row.value) cfg.wan2gp.url = row.value;
      } else if (row.category === "ffmpeg") {
        if (row.key === "path" && row.value) cfg.ffmpeg.path = row.value;
      } else if (row.category === "openai") {
        if (row.key === "url" && row.value) cfg.openai.url = row.value;
        if (row.key === "apiKey" && row.value) cfg.openai.apiKey = row.value;
        if (row.key === "model" && row.value) cfg.openai.model = row.value;
      }
    }

    cachedConfig = cfg;
    cacheTimestamp = now;
    return cfg;
  } catch {
    return defaults;
  }
}

export function invalidateCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}

export async function upsertSetting(category: string, key: string, value: string) {
  const existing = await db.select().from(settingsTable)
    .where(and(eq(settingsTable.category, category), eq(settingsTable.key, key)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(settingsTable).set({ value, updatedAt: new Date() })
      .where(eq(settingsTable.id, existing[0].id));
  } else {
    await db.insert(settingsTable).values({ category, key, value });
  }
  invalidateCache();
}

const config = defaults;
export default config;
