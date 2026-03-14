import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);

export interface TimelineClip {
  filePath: string;
  durationMs: number;
  type: "image" | "video";
}

export interface RenderOptions {
  clips: TimelineClip[];
  outputPath: string;
  fps?: number;
  width?: number;
  height?: number;
  audioPath?: string;
}

export async function renderTimeline(options: RenderOptions): Promise<string> {
  const { clips, outputPath, fps = 24, width = 1920, height = 1080, audioPath } = options;

  if (clips.length === 0) throw new Error("No clips to render");

  const tempDir = path.join(path.dirname(outputPath), ".render_temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const concatListPath = path.join(tempDir, "concat_list.txt");
  const entries: string[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const resolvedPath = path.resolve(clip.filePath);

    if (clip.type === "image") {
      const tempVideo = path.join(tempDir, `clip_${i}.mp4`);
      const durationSec = (clip.durationMs / 1000).toFixed(3);
      const scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`;

      await execFileAsync("ffmpeg", [
        "-y", "-loop", "1",
        "-i", resolvedPath,
        "-c:v", "libx264",
        "-t", durationSec,
        "-pix_fmt", "yuv420p",
        "-vf", scaleFilter,
        "-r", String(fps),
        tempVideo,
      ]);

      entries.push(`file '${tempVideo}'`);
    } else {
      entries.push(`file '${resolvedPath}'`);
    }
  }

  fs.writeFileSync(concatListPath, entries.join("\n"));

  const concatArgs = ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath];

  if (audioPath) {
    const resolvedAudio = path.resolve(audioPath);
    if (fs.existsSync(resolvedAudio)) {
      concatArgs.push("-i", resolvedAudio, "-c:v", "copy", "-c:a", "aac", "-shortest");
    } else {
      concatArgs.push("-c:v", "copy");
    }
  } else {
    concatArgs.push("-c:v", "copy");
  }

  concatArgs.push(outputPath);

  await execFileAsync("ffmpeg", concatArgs);

  try {
    fs.rmSync(tempDir, { recursive: true });
  } catch {}

  return outputPath;
}

export async function checkConnection(): Promise<{ connected: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execFileAsync("ffmpeg", ["-version"]);
    const versionMatch = stdout.match(/ffmpeg version (\S+)/);
    return { connected: true, version: versionMatch?.[1] || "unknown" };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
