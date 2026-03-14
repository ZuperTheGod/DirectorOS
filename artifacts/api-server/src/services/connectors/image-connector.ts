import config from "../../config/ai-services";

export interface ComfyWorkflow {
  prompt: Record<string, any>;
  client_id?: string;
}

export interface ImageGenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  scheduler?: string;
  checkpoint?: string;
}

function buildTextToImageWorkflow(params: ImageGenerationParams): ComfyWorkflow {
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

  return {
    prompt: {
      "3": {
        class_type: "KSampler",
        inputs: {
          seed,
          steps: params.steps ?? 25,
          cfg: params.cfg ?? 7.0,
          sampler_name: params.sampler ?? "euler_ancestral",
          scheduler: params.scheduler ?? "normal",
          denoise: 1.0,
          model: ["4", 0],
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["5", 0],
        },
      },
      "4": {
        class_type: "CheckpointLoaderSimple",
        inputs: {
          ckpt_name: params.checkpoint ?? "sd_xl_base_1.0.safetensors",
        },
      },
      "5": {
        class_type: "EmptyLatentImage",
        inputs: {
          width: params.width ?? 1024,
          height: params.height ?? 1024,
          batch_size: 1,
        },
      },
      "6": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: params.prompt,
          clip: ["4", 1],
        },
      },
      "7": {
        class_type: "CLIPTextEncode",
        inputs: {
          text: params.negativePrompt || "ugly, blurry, bad anatomy, low quality, watermark",
          clip: ["4", 1],
        },
      },
      "8": {
        class_type: "VAEDecode",
        inputs: {
          samples: ["3", 0],
          vae: ["4", 2],
        },
      },
      "9": {
        class_type: "SaveImage",
        inputs: {
          filename_prefix: "directoros",
          images: ["8", 0],
        },
      },
    },
  };
}

export async function submitWorkflow(workflow: ComfyWorkflow): Promise<{ prompt_id: string }> {
  const { url } = config.comfyui;

  const response = await fetch(`${url}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(workflow),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`ComfyUI error (${response.status}): ${errorText}`);
  }

  return await response.json() as { prompt_id: string };
}

export async function pollForCompletion(promptId: string, timeoutMs: number = 300000): Promise<string[]> {
  const { url } = config.comfyui;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${url}/history/${promptId}`);
    if (!response.ok) {
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    const data = await response.json() as any;
    const history = data[promptId];

    if (history?.status?.completed) {
      const outputs: string[] = [];
      for (const nodeId of Object.keys(history.outputs || {})) {
        const nodeOutput = history.outputs[nodeId];
        if (nodeOutput.images) {
          for (const img of nodeOutput.images) {
            outputs.push(img.filename);
          }
        }
      }
      return outputs;
    }

    if (history?.status?.status_str === "error") {
      throw new Error("ComfyUI workflow failed");
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  throw new Error("ComfyUI workflow timed out");
}

export async function downloadImage(filename: string): Promise<Buffer> {
  const { url } = config.comfyui;
  const response = await fetch(`${url}/view?filename=${encodeURIComponent(filename)}`);

  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateImage(params: ImageGenerationParams): Promise<Buffer> {
  const workflow = buildTextToImageWorkflow(params);
  const { prompt_id } = await submitWorkflow(workflow);
  const outputFiles = await pollForCompletion(prompt_id);

  if (outputFiles.length === 0) throw new Error("No output images from ComfyUI");

  return await downloadImage(outputFiles[0]);
}

export async function checkConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const { url } = config.comfyui;
    const response = await fetch(`${url}/system_stats`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { connected: false, error: `Status ${response.status}` };
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
