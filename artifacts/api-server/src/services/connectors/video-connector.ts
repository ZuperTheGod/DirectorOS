import { getConfig } from "../../config/ai-services";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

export interface VideoGenerationParams {
  imageFilePath: string;
  prompt: string;
  negativePrompt?: string;
  frames?: number;
  motionStrength?: number;
  seed?: number;
  width?: number;
  height?: number;
  model?: string;
}

const WORKFLOWS_DIR = path.join(process.cwd(), "workflows");

function loadWorkflow(name: string): Record<string, any> {
  const filePath = path.join(WORKFLOWS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workflow file not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildI2VWorkflow(params: VideoGenerationParams, uploadedFilename: string): Record<string, any> {
  const workflow = loadWorkflow("wan_image_to_video");

  if (workflow["1"]?.inputs) {
    workflow["1"].inputs.image = uploadedFilename;
  }

  if (workflow["2"]?.inputs) {
    workflow["2"].inputs.text = params.prompt;
  }

  if (workflow["3"]?.inputs) {
    workflow["3"].inputs.text = params.negativePrompt || "";
  }

  if (workflow["4"]?.inputs) {
    workflow["4"].inputs.width = params.width ?? 832;
    workflow["4"].inputs.height = params.height ?? 480;
    workflow["4"].inputs.num_frames = params.frames ?? 81;
    workflow["4"].inputs.seed = params.seed ?? Math.floor(Math.random() * 2147483647);
    workflow["4"].inputs.motion_strength = params.motionStrength ?? 10;
  }

  return workflow;
}

async function uploadImageToComfyUI(imagePath: string, comfyUrl: string): Promise<string> {
  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);

  const formData = new FormData();
  formData.append("image", new Blob([fileBuffer]), fileName);
  formData.append("overwrite", "true");

  const response = await fetch(`${comfyUrl}/upload/image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`ComfyUI image upload failed (${response.status}): ${errText}`);
  }

  const result = (await response.json()) as any;
  return result.name || fileName;
}

async function submitWorkflow(comfyUrl: string, workflow: Record<string, any>): Promise<string> {
  const response = await fetch(`${comfyUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`ComfyUI workflow submit error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as any;
  return result.prompt_id;
}

async function pollForCompletion(comfyUrl: string, promptId: string, timeoutMs: number = 600000): Promise<string[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${comfyUrl}/history/${promptId}`);
    if (!response.ok) {
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    const data = (await response.json()) as any;
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
        if (nodeOutput.gifs) {
          for (const gif of nodeOutput.gifs) {
            outputs.push(gif.filename);
          }
        }
      }
      return outputs;
    }

    if (history?.status?.status_str === "error") {
      throw new Error("ComfyUI video workflow failed");
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new Error("ComfyUI video workflow timed out");
}

async function downloadOutput(comfyUrl: string, filename: string): Promise<Buffer> {
  const response = await fetch(`${comfyUrl}/view?filename=${encodeURIComponent(filename)}`);
  if (!response.ok) throw new Error(`Failed to download output: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function convertToMp4(inputPath: string, outputPath: string, ffmpegBin: string): Promise<void> {
  const ext = path.extname(inputPath).toLowerCase();

  if (ext === ".mp4") {
    fs.copyFileSync(inputPath, outputPath);
    return;
  }

  await execFileAsync(ffmpegBin, [
    "-y",
    "-i", inputPath,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ]);
}

export async function generateVideo(params: VideoGenerationParams): Promise<Buffer> {
  const config = await getConfig();
  const comfyUrl = config.comfyui.url;

  if (!fs.existsSync(params.imageFilePath)) {
    throw new Error(`Source image not found: ${params.imageFilePath}`);
  }

  console.log("[VideoConnector] Uploading image to ComfyUI...");
  const uploadedFilename = await uploadImageToComfyUI(params.imageFilePath, comfyUrl);

  console.log("[VideoConnector] Building Wan2GP workflow...");
  const workflow = buildI2VWorkflow(params, uploadedFilename);

  console.log("[VideoConnector] Submitting workflow to ComfyUI...");
  const promptId = await submitWorkflow(comfyUrl, workflow);
  console.log(`[VideoConnector] Workflow submitted (prompt_id: ${promptId})`);

  console.log("[VideoConnector] Polling for completion...");
  const outputFiles = await pollForCompletion(comfyUrl, promptId);

  if (outputFiles.length === 0) {
    throw new Error("ComfyUI Wan2GP workflow produced no output");
  }

  console.log(`[VideoConnector] Downloading output: ${outputFiles[0]}`);
  const rawBuffer = await downloadOutput(comfyUrl, outputFiles[0]);

  const outputExt = path.extname(outputFiles[0]).toLowerCase();
  if (outputExt === ".mp4") {
    return rawBuffer;
  }

  console.log(`[VideoConnector] Converting ${outputExt} to MP4...`);
  const tempDir = path.join(process.cwd(), ".temp_video");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const tempInput = path.join(tempDir, `raw_${Date.now()}${outputExt}`);
  const tempOutput = path.join(tempDir, `converted_${Date.now()}.mp4`);

  fs.writeFileSync(tempInput, rawBuffer);

  try {
    await convertToMp4(tempInput, tempOutput, config.ffmpeg.path);
    const mp4Buffer = fs.readFileSync(tempOutput);
    return mp4Buffer;
  } finally {
    try { fs.unlinkSync(tempInput); } catch {}
    try { fs.unlinkSync(tempOutput); } catch {}
  }
}

export async function checkConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const config = await getConfig();
    const { url } = config.comfyui;

    const response = await fetch(`${url}/object_info/WanImageToVideo`, {
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      return { connected: true };
    }

    const sysResponse = await fetch(`${url}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    });
    if (sysResponse.ok) {
      return { connected: true };
    }

    return { connected: false, error: "ComfyUI not reachable or Wan2GP nodes not installed" };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
