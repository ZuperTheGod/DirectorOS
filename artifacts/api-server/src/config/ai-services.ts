export interface ServiceConfig {
  url: string;
  enabled: boolean;
  name: string;
  model?: string;
}

export interface AIServicesConfig {
  lmstudio: ServiceConfig;
  comfyui: ServiceConfig;
  ffmpeg: { enabled: boolean; name: string };
}

const config: AIServicesConfig = {
  lmstudio: {
    url: process.env.LMSTUDIO_URL || "http://localhost:1234",
    enabled: true,
    name: "LM Studio",
    model: process.env.LMSTUDIO_MODEL || "local-model",
  },
  comfyui: {
    url: process.env.COMFYUI_URL || "http://localhost:8188",
    enabled: true,
    name: "ComfyUI",
  },
  ffmpeg: {
    enabled: true,
    name: "FFmpeg",
  },
};

export default config;
