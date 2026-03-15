import { getConfig } from "../../config/ai-services";
import * as fs from "fs";
import * as path from "path";
import FormData from "form-data";

export interface VideoGenerationParams {
  imageFilePath: string;
  prompt: string;
  frames?: number;
  motionStrength?: number;
  seed?: number;
  width?: number;
  height?: number;
}

async function uploadImageToWan2GP(imagePath: string, wan2gpUrl: string): Promise<string> {
  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);

  const formData = new FormData();
  formData.append("files", fileBuffer, {
    filename: fileName,
    contentType: "image/png",
  });

  const response = await fetch(`${wan2gpUrl}/upload`, {
    method: "POST",
    body: formData as any,
    headers: formData.getHeaders(),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Wan2GP upload failed (${response.status}): ${errText}`);
  }

  const result = await response.json() as string[];
  if (!result || result.length === 0) throw new Error("Wan2GP upload returned no files");
  return result[0];
}

async function callGradioAPI(
  wan2gpUrl: string,
  fnIndex: number,
  data: any[]
): Promise<any> {
  const submitResponse = await fetch(`${wan2gpUrl}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fn_index: fnIndex,
      data: data,
      session_hash: `directoros_${Date.now()}`,
    }),
  });

  if (!submitResponse.ok) {
    const errText = await submitResponse.text().catch(() => "Unknown error");
    throw new Error(`Wan2GP API error (${submitResponse.status}): ${errText}`);
  }

  return await submitResponse.json();
}

async function callGradioQueue(
  wan2gpUrl: string,
  fnIndex: number,
  data: any[],
  timeoutMs: number = 600000
): Promise<any> {
  const sessionHash = `directoros_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const pushResponse = await fetch(`${wan2gpUrl}/queue/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fn_index: fnIndex,
      data: data,
      session_hash: sessionHash,
    }),
  });

  if (!pushResponse.ok) {
    const errText = await pushResponse.text().catch(() => "Unknown error");
    throw new Error(`Wan2GP queue push failed (${pushResponse.status}): ${errText}`);
  }

  const pushResult = await pushResponse.json() as any;
  const eventId = pushResult.hash;

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const statusResponse = await fetch(`${wan2gpUrl}/queue/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash: eventId }),
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json() as any;

      if (statusData.status === "COMPLETE") {
        return statusData.data;
      }
      if (statusData.status === "FAILED" || statusData.status === "ERROR") {
        throw new Error(`Wan2GP generation failed: ${JSON.stringify(statusData)}`);
      }
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  throw new Error("Wan2GP generation timed out");
}

async function pollSSEForResult(wan2gpUrl: string, sessionHash: string, timeoutMs: number = 600000): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${wan2gpUrl}/queue/data?session_hash=${sessionHash}`, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok || !response.body) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.msg === "process_completed") {
              return event.output;
            }
            if (event.msg === "process_generating") {
              console.log("[Wan2GP] Generating...", event.output?.progress_data);
            }
          } catch {}
        }
      }
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw new Error("Wan2GP SSE polling timed out");
}

export async function generateVideo(params: VideoGenerationParams): Promise<Buffer> {
  const config = await getConfig();
  const wan2gpUrl = config.wan2gp.url;

  const sessionHash = `directoros_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const imagePath = params.imageFilePath;

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Source image not found: ${imagePath}`);
  }

  const uploadedPath = await uploadImageToWan2GP(imagePath, wan2gpUrl);

  const joinResponse = await fetch(`${wan2gpUrl}/queue/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        null,
        uploadedPath,
        params.prompt,
        "",
        params.width ?? 832,
        params.height ?? 480,
        params.frames ?? 81,
        params.seed ?? -1,
        params.motionStrength ?? 10,
        30,
        5.0,
        "unipc_bh2",
      ],
      fn_index: 0,
      session_hash: sessionHash,
    }),
  });

  if (!joinResponse.ok) {
    const errText = await joinResponse.text().catch(() => "Unknown error");
    throw new Error(`Wan2GP queue join failed (${joinResponse.status}): ${errText}`);
  }

  const result = await pollSSEForResult(wan2gpUrl, sessionHash);

  if (!result || !result.data) {
    throw new Error("Wan2GP returned no output data");
  }

  const outputData = result.data;
  let videoUrl: string | null = null;

  if (Array.isArray(outputData)) {
    for (const item of outputData) {
      if (typeof item === "object" && item !== null) {
        if (item.video && typeof item.video === "object" && item.video.path) {
          videoUrl = item.video.path;
          break;
        }
        if (item.path && typeof item.path === "string") {
          videoUrl = item.path;
          break;
        }
      }
      if (typeof item === "string" && (item.endsWith(".mp4") || item.endsWith(".webm") || item.endsWith(".webp"))) {
        videoUrl = item;
        break;
      }
    }
  }

  if (!videoUrl) {
    throw new Error(`Wan2GP output format unexpected: ${JSON.stringify(outputData).slice(0, 500)}`);
  }

  const downloadUrl = videoUrl.startsWith("http") ? videoUrl : `${wan2gpUrl}/file=${videoUrl}`;
  const videoResponse = await fetch(downloadUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to download Wan2GP video: ${videoResponse.status}`);
  }

  const arrayBuffer = await videoResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function checkConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const config = await getConfig();
    const { url } = config.wan2gp;
    const response = await fetch(`${url}/info`, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      return { connected: true };
    }
    const configResponse = await fetch(`${url}/config`, { signal: AbortSignal.timeout(5000) });
    if (configResponse.ok) {
      return { connected: true };
    }
    return { connected: false, error: `Wan2GP not reachable at ${url}` };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
