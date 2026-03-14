import config from "../../config/ai-services";
import { submitWorkflow, pollForCompletion, downloadImage } from "./image-connector";

export interface VideoGenerationParams {
  imageFilename: string;
  prompt: string;
  frames?: number;
  motionStrength?: number;
  seed?: number;
  width?: number;
  height?: number;
}

function buildWanVideoWorkflow(params: VideoGenerationParams): { prompt: Record<string, any> } {
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

  return {
    prompt: {
      "1": {
        class_type: "LoadImage",
        inputs: {
          image: params.imageFilename,
        },
      },
      "2": {
        class_type: "WanVideoSampler",
        inputs: {
          prompt: params.prompt,
          image: ["1", 0],
          frames: params.frames ?? 81,
          motion_strength: params.motionStrength ?? 128,
          seed,
          width: params.width ?? 1024,
          height: params.height ?? 576,
        },
      },
      "3": {
        class_type: "SaveAnimatedWEBP",
        inputs: {
          filename_prefix: "directoros_video",
          fps: 24,
          lossless: false,
          quality: 85,
          method: "default",
          images: ["2", 0],
        },
      },
    },
  };
}

export async function generateVideo(params: VideoGenerationParams): Promise<Buffer> {
  const workflow = buildWanVideoWorkflow(params);
  const { prompt_id } = await submitWorkflow(workflow);
  const outputFiles = await pollForCompletion(prompt_id, 600000);

  if (outputFiles.length === 0) throw new Error("No output video from Wan2");

  return await downloadImage(outputFiles[0]);
}

export async function checkConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const { url } = config.comfyui;
    const response = await fetch(`${url}/object_info/WanVideoSampler`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { connected: false, error: "Wan2 nodes not installed in ComfyUI" };
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
