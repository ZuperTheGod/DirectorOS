export * as image from "./image-connector";
export * as video from "./video-connector";
export * as render from "./render-connector";

import { LMStudioProvider } from "../llm/providers/lmstudio-provider";
import { OpenAIProvider } from "../llm/providers/openai-provider";
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
  const lmProvider = new LMStudioProvider();
  const openaiProvider = new OpenAIProvider();

  const [lmResult, comfyResult, wanResult, ffmpegResult, openaiResult] = await Promise.all([
    lmProvider.checkConnection(),
    checkComfyUI(),
    checkWan(),
    checkFFmpeg(),
    openaiProvider.checkConnection(),
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
    {
      name: "ChatGPT / OpenAI",
      connected: openaiResult.connected,
      details: openaiResult.models ? { models: openaiResult.models } : undefined,
      error: openaiResult.error,
    },
  ];
}
