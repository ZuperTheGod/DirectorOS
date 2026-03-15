export * as llm from "./llm-connector";
export * as image from "./image-connector";
export * as video from "./video-connector";
export * as render from "./render-connector";

import { checkConnection as checkLLM } from "./llm-connector";
import { checkConnection as checkComfyUI } from "./image-connector";
import { checkConnection as checkWan } from "./video-connector";
import { checkConnection as checkFFmpeg } from "./render-connector";

export interface ServiceStatus {
  name: string;
  connected: boolean;
  details?: Record<string, any>;
  error?: string;
}

export async function checkAllServices(): Promise<ServiceStatus[]> {
  const [lmResult, comfyResult, wanResult, ffmpegResult] = await Promise.all([
    checkLLM(),
    checkComfyUI(),
    checkWan(),
    checkFFmpeg(),
  ]);

  return [
    {
      name: "LM Studio",
      connected: lmResult.connected,
      details: lmResult.models ? { models: lmResult.models } : undefined,
      error: lmResult.error,
    },
    {
      name: "ComfyUI",
      connected: comfyResult.connected,
      error: comfyResult.error,
    },
    {
      name: "Wan2GP",
      connected: wanResult.connected,
      error: wanResult.error,
    },
    {
      name: "FFmpeg",
      connected: ffmpegResult.connected,
      details: ffmpegResult.version ? { version: ffmpegResult.version } : undefined,
      error: ffmpegResult.error,
    },
  ];
}
